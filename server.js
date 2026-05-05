const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

const GARENA_API = 'https://loginbp.ggpolarbear.com';
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const HEX_GEN_KEY = "2ee44819e9b4598845141067b281621874d0d5d7af9d8f7e00c1e54715b7d1e3";

let requestLogs = []; // Server memory logs
let MajorLoginReq, MajorLoginRes;

// Load Protos
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});

function decrypt(buffer) {
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', AES_KEY, AES_IV);
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) { return null; }
}

function logTraffic(method, path, status, startTime, reqData, resData) {
    const entry = {
        id: Date.now() + Math.random(),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData,
        time: new Date().toLocaleTimeString()
    };
    requestLogs.unshift(entry);
    if (requestLogs.length > 100) requestLogs.pop();
}

// ==========================================
// 🚀 GUEST ID GENERATOR
// ==========================================
app.get('/api/generate-guest', async (req, res) => {
    try {
        const pass = crypto.randomBytes(32).toString('hex').toUpperCase();
        const regPayload = JSON.stringify({app_id: 100067, client_type: 2, password: pass, source: 2});
        const regSig = crypto.createHmac('sha256', Buffer.from(HEX_GEN_KEY, 'hex')).update(regPayload).digest('hex');

        const r = await fetch('https://100067.connect.garena.com/api/v2/oauth/guest:register', {
            method: 'POST',
            headers: {'Authorization': `Signature ${regSig}`, 'Content-Type': 'application/json'},
            body: regPayload
        });
        const data = await r.json();
        res.json({ success: true, uid: data.data.uid, password: pass });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

// ==========================================
// 🛡️ LOCAL BYPASS (OFFICIAL VERSION)
// ==========================================
const LOCAL_RESPONSES = {
    "/ver.php": {
        status: 200,
        type: 'application/json',
        data: Buffer.from(JSON.stringify({
            "code": 0, "is_server_open": true, "remote_version": "1.123.10",
            "cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "server_url": "https://rm-proxy-intercept.vercel.app/",
            "billboard_msg": "👑 KING_NEXUS: V4 ACTIVE",
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefireth"
        }))
    }
};

// ==========================================
// 🌌 THE AURORA DASHBOARD (MOBILE OPTIMIZED)
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({success:true}); });
app.get('/', (req, res) => res.redirect('/romeo/ds'));

app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>👑 Nexus V4</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600&family=JetBrains+Mono&display=swap');
            body { background: #050508; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            .aurora { text-shadow: 0 0 10px #8b5cf6, 0 0 20px #6366f1; }
            .card-glow { border: 1px solid rgba(139, 92, 246, 0.2); box-shadow: 0 0 15px rgba(0,0,0,0.5); }
            pre { font-size: 10px; line-height: 1.4; word-break: break-all; white-space: pre-wrap; }
        </style>
    </head>
    <body class="p-2 sm:p-6">
        <div class="max-w-4xl mx-auto">
            <header class="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                <div>
                    <h1 class="text-xl font-bold text-purple-400 aurora" style="font-family: 'Orbitron'">NEXUS_V4</h1>
                    <p class="text-[8px] text-gray-500 uppercase tracking-widest">Standalone Deep Interceptor</p>
                </div>
                <div class="flex gap-1">
                    <button onclick="copyAll()" class="bg-purple-600/20 text-purple-400 border border-purple-500/30 p-2 rounded-lg text-[10px] font-bold">📋 COPY</button>
                    <button onclick="clearLogs()" class="bg-red-900/20 text-red-500 border border-red-500/30 p-2 rounded-lg text-[10px] font-bold">🗑️</button>
                </div>
            </header>

            <div id="log-container" class="space-y-3"></div>
        </div>

        <script>
            let lastUpdate = "";
            async function clearLogs() { await fetch('/api/internal/clear', {method:'POST'}); render(); }
            async function copyAll() {
                const res = await fetch('/api/internal/logs');
                const data = await res.json();
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                alert("Copied!");
            }

            async function render() {
                try {
                    const res = await fetch('/api/internal/logs');
                    const logs = await res.json();
                    if(JSON.stringify(logs) === lastUpdate) return;
                    lastUpdate = JSON.stringify(logs);

                    document.getElementById('log-container').innerHTML = logs.map(log => \`
                        <div class="bg-[#0f0f15] rounded-xl p-3 card-glow">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex flex-col">
                                    <span class="text-[10px] text-purple-400 font-bold uppercase">\${log.method} | \${log.path.split('?')[0]}</span>
                                    <span class="text-[8px] text-gray-600">\${log.time} | \${log.status} | \${log.duration}</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 gap-2">
                                <div class="bg-black/50 p-2 rounded border border-white/5">
                                    <p class="text-[7px] text-gray-500 mb-1 uppercase font-black">Request</p>
                                    <pre class="text-blue-300/80">\${log.req}</pre>
                                </div>
                                <div class="bg-black/50 p-2 rounded border border-white/5">
                                    <p class="text-[7px] text-gray-500 mb-1 uppercase font-black">Response</p>
                                    <pre class="text-emerald-300/80">\${log.res}</pre>
                                </div>
                            </div>
                        </div>
                    \`).join('');
                } catch(e){}
            }
            setInterval(render, 1500);
            render();
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🚀 THE MASTER INTERCEPTOR
// ==========================================
app.all('*', async (req, res) => {
    const startTime = Date.now();
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/api/generate-guest') return;

    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReq = "Binary Payload";
    
    // Auto-Decrypt MajorLogin
    if (req.path.includes('MajorLogin') && reqBuffer.length > 0) {
        const dec = decrypt(reqBuffer);
        if (dec && MajorLoginReq) {
            try { parsedReq = JSON.stringify(MajorLoginReq.toObject(MajorLoginReq.decode(dec), {defaults:true}), null, 2); } catch(e) {}
        }
    } else if (Object.keys(req.query).length > 0) {
        parsedReq = JSON.stringify(req.query, null, 2);
    }

    // Check Local Mock
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        res.setHeader('Content-Type', mock.type);
        return res.status(mock.status).send(mock.data);
    }

    try {
        const targetUrl = `${GARENA_API}${req.originalUrl}`;
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: { 
                ...req.headers, 
                'host': 'loginbp.ggpolarbear.com', // Fix connectivity
                'accept-encoding': 'identity' 
            },
            body: reqBuffer.length > 0 ? reqBuffer : undefined
        });

        const resBuffer = Buffer.from(await response.arrayBuffer());
        let parsedRes = `Size: ${resBuffer.length} bytes`;

        if (req.path.includes('MajorLogin') && MajorLoginRes) {
            try { parsedRes = JSON.stringify(MajorLoginRes.toObject(MajorLoginRes.decode(resBuffer), {defaults:true}), null, 2); } catch(e) {}
        }

        response.headers.forEach((v, n) => res.setHeader(n, v));
        res.status(response.status).send(resBuffer);
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReq, parsedRes);

    } catch (e) {
        if (!res.headersSent) res.status(502).end();
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReq, "Error: " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
