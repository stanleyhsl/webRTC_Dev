const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const os = require('os');
const cors = require('cors');
const { exec } = require('child_process');
const serveIndex = require('serve-index');
require('colors');

// 获取自定义port
let [, httpPort = 4000] = process.argv.slice(2).join(' ').match(/-p\s*(\d+)/) || [];
httpPort = Number(httpPort);
const httpsPort = httpPort + 1;

const options = {
    key: fs.readFileSync(path.join(__dirname, './ssh', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, './ssh', 'cert.pem')),
};


   
const app = express();

app.use(cors({ credentials: true }));

app.use((req, res, next) => {
    res.append('Service-Worker-Allowed', '/');

    next(); 
});

app.use(serveIndex('./'));
app.use(express.static(path.resolve(__dirname)));
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './getdevice.html')); 
});

http.createServer(app).listen(httpPort, '0.0.0.0');
https.createServer(options, app).listen(httpsPort, '0.0.0.0');

