// 拿到dom元素
const localVideo = document.querySelector('video#localvideo')
const remoteVideo = document.querySelector('video#remotevideo')

const btnConn = document.querySelector('button#connserver')
const btnLeave = document.querySelector('button#leave')

const fileInput = document.querySelector('input#fileInput')

const downloadAnchor = document.querySelector('a#download')
const sendProgress = document.querySelector('progress#sendProgress')
const btnSendFile = document.querySelector('button#sendFile')

const addZero = n => (n > 10 ? n : `0${n}`)
const toString = v => (typeof v === 'string' ? v : JSON.stringify(v, null, 4))

// 日志
function statusLog (...args) {
  let [who, info, ...other] = args
  const d = new Date()
  let line = `[${toString(who)}] ${toString(info)}`
  other.forEach(o => (line += toString(o)))

  const li = document.createElement('li')
  li.innerHTML = `<pre>${line}</pre>`
  connetstateUl.appendChild(li)
}

const webClient = new WebClient(
  [localVideo, remoteVideo],
  {
    roomId: 123,
    pcConfig: {
      // turn服务器地址
      iceServers: [
        {
          urls: 'turn:stun.stanley.com:3478',
          credential: 'stanley',
          username: '111'
        }
      ]
    }
  },
  statusLog
)

// 连接signal服务器
btnConn.onclick = () => {
  webClient.connect(err => {
    console.log(err || '连接成功')
    btnConn.disabled = true
    btnLeave.disabled = false
  })
}

// 离开
btnLeave.onclick = () => {
  webClient.leave()
  btnConn.disabled = false
  btnLeave.disabled = true
}

// 注册收到文件的回调
webClient.onReciveFileFinish = ({ fileName, filetype }, received) => {
  downloadAnchor.href = URL.createObjectURL(received)
  downloadAnchor.download = fileName
  downloadAnchor.style.display = 'block'
  const span = document.createElement('span')
  span.textContent = `点击下载 '${fileName}' (${received.size} bytes)`
  downloadAnchor.innerHTML=''
  downloadAnchor.appendChild(span)
  
  let dom
  if (['image/jpeg', 'image/png'].includes(filetype)) {
    dom = document.createElement('img')
    dom.src = downloadAnchor.href
  } else if ((filetype = 'video/mp4')) {
    dom = document.createElement('video')
    dom.src = downloadAnchor.href
    dom.autoplay = true
  }

  dom && downloadAnchor.appendChild(dom)
}

// 发送文件,必须在p2p视频成功连接后才可进行
btnSendFile.onclick = () => {
  const file = fileInput.files[0]
  if (!file) return
  sendProgress.max = file.size

  webClient.sendFile(file, bytes => {
    sendProgress.value = bytes
  })
}

fileInput.onchange = function () {
  const file = this.files[0]
  if (!file) {
    console.log('No file chosen')
    return
  }
  console.log(file.type, file.size)
}
