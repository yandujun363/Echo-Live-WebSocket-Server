const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

let config = {
    home_page: './editor.html',
    port: 3000
};

try {
    config = JSON.parse(fs.readFileSync('server_config.json', 'utf8'));
} catch (error) {
    console.error('Error reading config.json:', error);
}

const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = config.homePage;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    console.log(filePath);
    
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.xml': 'text/xml',
        '.txt': 'text/plain',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // 读取文件并返回响应
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, there was an error: ' + error.code + '..\n', 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(config.port, () => {
    logOutput(`Server is running at http://localhost:${config.port}/`, 'success');
    logOutput(`WebSocket server at ws://localhost:${config.port}/`, 'success');
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
    logOutput('New client connect', 'success');
    clients.add(ws);

    ws.on('message', (message) => {
        let messageString;
        if (Buffer.isBuffer(message)) {
            messageString = message.toString();
        } else if (typeof message === 'string') {
            messageString = message;
        } else {
            try {
                messageString = JSON.stringify(message);
            } catch (error) {
                logOutput('Message type error', 'error');
            }
        }
        logOutput(`Received: ${messageString}`);

        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    });

    ws.on('close', () => {
        logOutput('Client disconnected', 'warn');
        clients.delete(ws);
    });
});

function formatDateToObject(value = undefined) {
    let date = value != undefined ? new Date(value) : new Date();
    const padZero = (num, pad = 2) => num.toString().padStart(pad, '0');

    const y = date.getFullYear();
    const M = date.getMonth() + 1;
    const d = date.getDate();
    const h = date.getHours();
    const m = date.getMinutes();
    const s = date.getSeconds();
    const ms = date.getMilliseconds();
    const utcz = date.getTimezoneOffset() / 60
    const utc = utcz < 0 ? utcz * -1 : utcz * 1
    const h12 = (h % 12) || 12;
    let utcs = '';
    if (utc != 0) {
        utcs = ( utc > 0 ? '+' : '-' ) + utc
    }

    return {
        y: y,
        M: M,
        d: d,
        h: h,
        h12: h12,
        m: m,
        s: s,
        ms: ms,
        MM: padZero(M),
        dd: padZero(d),
        hh: padZero(h),
        hh12: padZero(h12),
        mm: padZero(m),
        ss: padZero(s),
        mms: padZero(ms, 3),
        utc: utc,
        utcs: utcs,
        isAM: h < 12,
        isPM: h >= 12,
        AMorPM: h < 12 ? 'am' : 'pm'
    };
}

function logOutput(message, type = 'info') {
    const colorDB = {
        'info': '\x1b[37m%s\x1b[0m',
        'success': '\x1b[32m%s\x1b[0m',
        'warn': '\x1b[33m%s\x1b[0m',
        'error': '\x1b[31m%s\x1b[0m'
    }

    let color = colorDB[type] || colorDB.info;

    const time = formatDateToObject();

    console.log(color, `[${time.y}-${time.MM}-${time.dd} ${time.hh}:${time.mm}:${time.ss}] ${message}`);
}