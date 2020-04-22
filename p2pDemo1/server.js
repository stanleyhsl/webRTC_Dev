/**
 * 第一个成功的例子，实现一个p2p的视频聊天
 * 需要turn服务器配合
 */
'use strict'

var log4js = require('log4js');
var http = require('http');
var https = require('https');
var fs = require('fs');
var socketIo = require('socket.io');

var express = require('express');
var serveIndex = require('serve-index');

var USERCOUNT = 2;

log4js.configure({
    appenders: {
        file: {
            type: 'file',
            filename: 'app.log',
            layout: {
                type: 'pattern',
                pattern: '%r %p - %m',
            }
        }
    },
    categories: {
       default: {
          appenders: ['file'],
          level: 'debug'
       }
    }
});

var logger = log4js.getLogger();

var app = express();
app.use(serveIndex('./public'));
app.use(express.static('./public'));



var options = {
	key : fs.readFileSync('./cert/1557605_www.learningrtc.cn.key'),
	cert: fs.readFileSync('./cert/1557605_www.learningrtc.cn.pem')
}

//https server
var https_server = https.createServer(options, app);
var io = socketIo.listen(https_server);

io.sockets.on('connection', (socket)=> {
	// 有用户连接进来，取个名子文件打日志
	let str = socket.id;
	let name = str.charAt(0) + str.slice(str.length-2);
	name = `[${name.toUpperCase()}]`;
	socket.on('message', (room, data)=>{
		logger.debug(name,' message:',data.type);
		socket.to(room).emit('message',room, data);
	});

	socket.on('join', (room)=>{
		socket.join(room);
		var myRoom = io.sockets.adapter.rooms[room]; 
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.debug(name,'join 房间人数为: ' + users);

		if(users <= USERCOUNT){
			socket.emit('joined', room, name); //发给除自己之外的房间内的所有人
			if(users > 1){
				socket.to(room).emit('otherjoin', room, name);
			}
		}else{
			socket.leave(room);	
			socket.emit('full', room, name);
		}
		//socket.emit('joined', room, name); //发给自己
		//socket.broadcast.emit('joined', room, name); //发给除自己之外的这个节点上的所有人
		//io.in(room).emit('joined', room, name); //发给房间内的所有人
	});

	socket.on('leave', (room)=>{
		var myRoom = io.sockets.adapter.rooms[room]; 
		var users = (myRoom)? Object.keys(myRoom.sockets).length : 0;
		logger.debug(name,'leave,the user number of room is: ' + (users-1));
		socket.to(room).emit('bye', room, name);
		socket.emit('leaved', room, name);
	});

});

https_server.listen(443, '0.0.0.0', err =>{
	console.log(err || '成功监听433端口！')
});




