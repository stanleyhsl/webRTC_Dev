'use strict'

var log4js = require('log4js')
var http = require('http')
var https = require('https')
var fs = require('fs')
var socketIo = require('socket.io')

var express = require('express')
var serveIndex = require('serve-index')
var bodyParser = require('body-parser')

var USERCOUNT = 3

log4js.configure({
    appenders: {
        file: {
            type: 'file',
            filename: 'app.log',
            layout: {
                type: 'pattern',
                pattern: '%r %p - %m',
            },
        },
    },
    categories: {
        default: {
            appenders: ['file'],
            level: 'debug',
        },
    },
})

var logger = log4js.getLogger()

var app = express()
app.use(
    bodyParser.urlencoded({
        extended: false, //扩展模式
    })
)

app.use(bodyParser.json())

app.use(express.static('./public'))
app.post('/api/desc', function (req, res) {
    res.send('收到了')
    logger.info(req.body)
})
app.use(serveIndex('./public'))

var options = {
    key: fs.readFileSync('./cert/stanley.com.key'),
    cert: fs.readFileSync('./cert/stanley.com.crt'),
}

//https server
var https_server = https.createServer(options, app)
var io = socketIo.listen(https_server)

io.sockets.on('connection', socket => {
    // 转发数据给其它人
    socket.on('message', (room, data) => {
        socket.to(room).emit('message', room, data)
    })

    // 上线流程
    socket.on('join', room => {
        socket.join(room)
        var myRoom = io.sockets.adapter.rooms[room]
        var users = myRoom ? Object.keys(myRoom.sockets).length : 0
        logger.debug('the user number of room is: ' + users)
        // 只支持两个人的聊天
        if (users < USERCOUNT) {
            socket.emit('joined', room, socket.id) //发给除自己之外的房间内的所有人
            if (users > 1) {
                socket.to(room).emit('otherjoin', room, socket.id)
            }
        } else {
            socket.leave(room)
            socket.emit('full', room, socket.id)
        }
        //socket.emit('joined', room, socket.id); //发给自己
        //socket.broadcast.emit('joined', room, socket.id); //发给除自己之外的这个节点上的所有人
        //io.in(room).emit('joined', room, socket.id); //发给房间内的所有人
    })

    // 下线流程
    socket.on('leave', room => {
        var myRoom = io.sockets.adapter.rooms[room]
        var users = myRoom ? Object.keys(myRoom.sockets).length : 0
        logger.debug('the user number of room is: ' + (users - 1))
        socket.to(room).emit('bye', room, socket.id) // 通知对方，我已经下线
        socket.emit('leaved', room, socket.id) // 通知自己，下线成功
    })
})

https_server.listen(443, '0.0.0.0', err => {
    console.log(err || '成功监听443')
})
