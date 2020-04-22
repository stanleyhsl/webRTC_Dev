const https = require('https')
const fs = require('fs')
const path = require('path')
const express = require('express')
const os = require('os')
const cors = require('cors')
const { exec } = require('child_process')
const serveIndex = require('serve-index')
const socketIO = require('socket.io')
const log4js = require('log4js')

require('colors')

// 获取port
const httpsPort = 4001

var options = {
  key: fs.readFileSync('./cert/stanley.com.key'),
  cert: fs.readFileSync('./cert/stanley.com.crt')
}

log4js.configure({
  appenders: {
    file: {
      type: 'file',
      filename: 'app.log',
      layout: {
        type: 'pattern',
        pattern: '%r %p - %m'
      }
    }
  },
  categories: {
    default: {
      appenders: ['file'],
      level: 'debug'
    }
  }
})

const logger = log4js.getLogger()

const app = express()

app.use(cors({ credentials: true }))

app.use((req, res, next) => {
  res.append('Service-Worker-Allowed', '/')

  next()
})

app.use(serveIndex('./'))
app.use(express.static(path.resolve(__dirname)))

const server = https.createServer(options, app)

const io = socketIO.listen(server)
logger.log('start', 2, 3)

io.sockets.on('connection', socket => {
  const { id } = socket
  logger.info(id, '加入')

  socket.on('join', room => {
    socket.join(room)
    const { num } = getUserInfo(room)
    const info = `总人数：${num}`
    // socket.emit('joined', room, id); // 自己
    // socket.to(room).emit('joined', room, id); // 除自己之外
    io.in(room).emit('joined', room, id, info) // 房间内所有人的
    // socket.broadcast.emit('joined', room, id, info); // 除了自己，全部站点
    logger.info(id, '加入，房间内总人数：', num)
  })

  socket.on('leave', room => {
    const { num } = getUserInfo(room)
    logger.info(id, '离开，房间内剩下人数：', num - 1)
    socket.leave(room)
  })
  socket.on('message', (room, id, data) => {
    logger.info('client msg:', data)
    io.in(room).emit('message', room, id, data) // 房间内所有人的
  })
  socket.on('getUserInfos', room => {
    // socket.emit('joined', room, id); // 房间内所有人
    logger.info('clietnt获取房间人员信息:', room)
    socket.emit('userInfos', getUserInfo(room))
  })
})

io.sockets.on('message', msg => {
  logger.info('server Got:', msg)
})

server.listen(httpsPort, '0.0.0.0', err => {
  logger.info('成功监听在:', httpsPort)
})

function getUserInfo (room) {
  const myRoom = io.sockets.adapter.rooms[room]
  if (!myRoom) return {}

  const { length: num } = Object.keys(myRoom.sockets)
  return { num, users: myRoom.sockets }
}
