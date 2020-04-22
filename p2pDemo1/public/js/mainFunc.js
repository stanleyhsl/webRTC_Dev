// 拿到dom元素
const localVideo = document.querySelector('video#localvideo')
const remoteVideo = document.querySelector('video#remotevideo')

const btnConn = document.querySelector('button#connserver')
const btnLeave = document.querySelector('button#leave')

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

btnConn.onclick = () => {
  webClient.connect(err => {
    console.log(err || '连接成功')
    btnConn.disabled = true
    btnLeave.disabled = false
  })
}

btnLeave.onclick = () => {
  webClient.leave()
  btnConn.disabled = false
  btnLeave.disabled = true
}
