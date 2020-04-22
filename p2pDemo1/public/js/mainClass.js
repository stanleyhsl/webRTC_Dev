/**
 * Class版本，面向对象的点对点视频聊天
 */

class WebClient {
  constructor ([localVideo, remoteVideo], config, log) {
    this.localVideo = localVideo
    this.remoteVideo = remoteVideo
    this.log = log
    this.roomId = config.roomId
    this.pcConfig = config.pcConfig
  }

  localStream = null // 本地视频流
  socket = null // 与signal服务器连接的套接字
  pc = null // 与trun服务器连接的套接字
  state = 0 // 客户端状态机

  // 负责创建PeerConnection,但并不会发起stun协议，
  // 因为并没有调用.createOffer方法，将在otherJoin中调用。
  createPeerConnection () {
    this.log('RTCPeerConnection', 'func')
    let { pc, localStream } = this
    // 创建PeerConection,设置turn服务器地址
    if (!pc) {
      this.pc = pc = new RTCPeerConnection(this.pcConfig) //只是创建实例，并未开始
      this.log('RTCPeerConnection', 'new')

      // 注册收到trun发来的candidate事件
      pc.onicecandidate = e => {
        this.log('PC☢onICEcandidate', 'pc收到来自stun的candidate')
        // debugger

        if (e.candidate) {
          const arg = {
            type: 'candidate',
            label: e.candidate.sdpMLineIndex,
            id: e.candidate.sdpMid,
            candidate: e.candidate.candidate
          }
          this.log('SIG✈', '向sig发送candidate')
          this.sendMessage(arg)
        } else {
          this.log('PC☢candidate', '结束符')
        }
      }

      // 注册收到远端视频流
      pc.ontrack = e => {
        this.log('PC☢ontrack', '收到对端视频流')
        this.remoteStream = e.streams[0]
        this.remoteVideo.srcObject = e.streams[0]
      }
    } else {
      this.log('RTCPeerConnection', '已经存在')
    }

    // 绑定视频流到PeerConnection
    if (!localStream) {
      this.error('本地流错误 is null or undefined!')
      return false
    }

    //把所有流加到 peer connection，
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream)
    })

    return true
  }

  sendMessage (data) {
    if (!this.socket) return
    this.socket.emit('message', this.roomId, data)
  }

  // 只有收到对otherjoin时才发起message -> offer
  call () {
    this.log('call', this.state)
    if (this.state === 'joined_conn') {
      var offerOptions = {
        offerToRecieveAudio: 1,
        offerToRecieveVideo: 1
      }

      this.pc
        .createOffer(offerOptions)
        .then(desc => {
          this.pc.setLocalDescription(desc) // ▶发送给trun服务器，收集candidate
          this.log('向sig发offer✈', desc.toJSON())
          this.sendMessage(desc.toJSON())
        })
        .catch(e => this.log('createOffer:', e.toString()))
    }
  }

  join () {
    return new Promise((resove, reject) => {
      //2.连接signla服务器接收，服务器数据
      const _sk = io.connect()
      this.socket = _sk

      // 成功连接sig服务器,后准备PeerConnect实例
      _sk.on('joined', (roomid, id) => {
        this.state = 'joined'
        this.log('SIG☄joined', 'state=', this.state)
        this.createPeerConnection()
        resove('连接singal器，加入房间成功')
      })

      // 后继的连接turn
      _sk.on('otherjoin', roomid => {
        if (this.state === 'joined_unbind') {
          // 后继挂断后连接才会用到
          this.log('SIG☄otherjoin', 'state:', this.state, '重新连接建立PeerCon')
          this.createPeerConnection()
        }

        this.state = 'joined_conn'
        this.log('SIG☄otherjoin', 'state:', this.state)

        this.call()
      })

      _sk.on('full', (roomid, id) => {
        this.state = 'leaved'
        this.log('SIG☄full', 'state=', this.state, '连接已经满了')
        reject('连接已经满！')
      })

      _sk.on('leaved', (roomid, id) => {
        this.state = 'leaved'
        this.socket.disconnect()

        btnConn.disabled = false
        btnLeave.disabled = true
        this.log('SIG☄leaved', 'state:', this.state)
      })

      // 对方下线
      _sk.on('bye', (roomid, id) => {
        this.state = 'joined_unbind'
        // 切断连接hangup
        this.hangup()
        this.log('SIG☄bye', 'state:', this.state)
      })

      // 只有自己离开时才会调用
      _sk.on('disconnect', () => {
        this.state = 'leaved'
        this.log('socket-disconnect', 'state:', this.state)
      })

      // 这里的message全部是指令
      _sk.on('message', this.onMessage)

      // 3.向信令服务器请求加入
      _sk.emit('join', this.roomId)
      this.log('join', '向sig发送加入请求')
    })
  }

  onMessage = (roomid, data) => {
    this.log('SIG☄message', data)

    if (!data) {
      this.log('the message is invalid!')
      return
    }
    // signal服务发来自于trun的offer
    if (data.type === 'offer') {
      this.pc.setRemoteDescription(new RTCSessionDescription(data))
      this.log('是offer', 'createAnswer')
      //收到offer 回复
      this.pc.createAnswer().then(desc => {
        this.pc.setLocalDescription(desc) // ▶发送给trun服务器，收集candidate
        //send answer sdp
        this.log(
          '✈createAnswer',
          '收到offer后,从本地取出desc发给对方：',
          desc.toJSON()
        )

        this.sendMessage(desc)
      })
    } else if (data.type == 'answer') {
      // answer.value = data.sdp
      this.log('SIG☄answer', '收到answer,setRemoteDescription')
      this.pc.setRemoteDescription(new RTCSessionDescription(data))
    } else if (data.type === 'candidate') {
      this.log(
        'SIG☄candidate',
        '收到对方从sig发来的candidate,放入到本地pc.addIceCandidate(candidate)'
      )

      // TURN服务发来的candidnate,打洞用
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate
      })
      this.pc.addIceCandidate(candidate)
    } else {
      this.log('the message is invalid!', data)
    }
  }

  async connect (cb) {
    try {
      //1.开启本地视频
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      })
      this.localStream = stream
      this.localVideo.srcObject = stream //播放本地视频

      // 信令服务器请求加入
      const ret = await this.join()
      this.log('join方法结束', ret)
      cb()
    } catch (e) {
      this.log('connect', e.toString())
      cb('发生错误:')
    }
  }

  hangup = () => {
    if (!this.pc) return
    this.pc.close()
    this.pc = null
  }

  // 对方挂断时，不关闭自己的视频，自己主动挂断时，才断自己的。
  closeLocalMedia = () => {
    const { localStream } = this
    if (localStream && localStream.getTracks()) {
      localStream.getTracks().forEach(track => {
        track.stop()
      })
    }
    this.localStream = null
  }

  leave = () => {
    if (this.socket) {
      this.socket.emit('leave', this.roomId) //notify server
    }

    this.hangup()
    this.closeLocalMedia()
  }
}
