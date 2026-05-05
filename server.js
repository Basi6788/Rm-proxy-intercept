const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

const GARENA_API = 'https://loginbp.ggpolarbear.com';
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');

let requestLogs = [];
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
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData,
        timestamp: new Date().toLocaleTimeString()
    };
    requestLogs.unshift(entry);
    if (requestLogs.length > 300) requestLogs.pop(); // Increased limit
}

// --- OFFICIAL VERSION FIX ---
const LOCAL_RESPONSES = {
    "/ver.php": {
        status: 200,
        type: 'application/json',
        data: Buffer.from(JSON.stringify({
            "code": 0, "is_server_open": true, "is_firewall_open": false,
            "cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "latest_release_version": "OB53",
            "remote_version": "1.123.10", // 🔥 MATCHED TO YOUR LOGS
            "server_url": "https://rm-proxy-intercept.vercel.app/",
            "core_url": "csoversea.castle.freefiremobile.com",
            "billboard_msg": "👑 KING_NEXUS: DEEP CAPTURE ONLINE",
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefireth"
        }))
    }
};

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

// 🌌 THE NEW INVENTORY DASHBOARD
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>👑 Nexus Deep Interceptor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Orbitron:wght@700&display=swap');
            body { background: #020205; color: #cbd5e1; font-family: 'JetBrains Mono', monospace; }
            .aurora-glow { box-shadow: 0 0 15px rgba(139, 92, 246, 0.3); border: 1px solid rgba(139, 92, 246, 0.2); }
            ::-webkit-scrollbar { width: 4px; }
            ::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 10px; }
        </style>
    </head>
    <body class="p-4">
        <header class="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-indigo-400 tracking-tighter" style="font-family: 'Orbitron'">KING_NEXUS_V3</h1>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Deep Packet Inspection Active</p>
            </div>
            <div class="flex gap-2">
                <button onclick="copyAll()" class="bg-indigo-600/20 text-indigo-400 border border-indigo-500/50 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-500 hover:text-white transition-all">📋 COPY ALL DATA</button>
                <button onclick="clearLogs()" class="bg-red-900/20 text-red-500 border border-red-500/30 px-4 py-2 rounded-full text-xs font-bold hover:bg-red-600 transition-all">🗑️ CLEAR</button>
            </div>
        </header>

        <div id="log-list" class="space-y-4"></div>

        <script>
            let lastData = "";
            async function clearLogs() { await fetch('/api/internal/clear', {method:'POST'}); render(); }
            async function copyAll() {
                const res = await fetch('/api/internal/logs');
                const data = await res.json();
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                alert("All logs copied!");
            }

            function getCategory(path, reqData) {
                if(path.includes('MajorLogin')) return '🔑 AUTH';
                if(path.includes('ver.php')) return '⚙️ CONFIG';
                if(path.includes('GetOutfit') || path.includes('GetAccountOutfit')) return '🧥 INVENTORY';
                return '📡 NETWORK';
            }

            async function render() {
                const res = await fetch('/api/internal/logs');
                const logs = await res.json();
                if(JSON.stringify(logs) === lastData) return;
                lastData = JSON.stringify(logs);

                const container = document.getElementById('log-list');
                container.innerHTML = logs.map(log => \`
                    <div class="bg-[#0a0a0f] border border-white/5 rounded-lg p-3 hover:border-indigo-500/30 transition-all">
                        <div class="flex justify-between items-center mb-2">
                            <div class="flex gap-2 items-center">
                                <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-bold">\${log.method}</span>
                                <span class="text-xs text-indigo-300 font-bold">\${log.path.split('?')[0]}</span>
                                <span class="text-[9px] text-gray-500 uppercase">\${getCategory(log.path)}</span>
                            </div>
                            <span class="text-[10px] text-gray-600">\${log.timestamp} | \${log.status}</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <pre class="text-[10px] bg-black/40 p-2 rounded text-blue-400/80 overflow-x-auto">\${log.req}</pre>
                            <pre class="text-[10px] bg-black/40 p-2 rounded text-emerald-400/80 overflow-x-auto">\${log.res}</pre>
                        </div>
                    </div>
                \`).join('');
            }
            setInterval(render, 1000);
        </script>
    </body>
    </html>
    `);
});

// --- THE MASTER INTERCEPTOR ---
app.all('*', async (req, res) => {
    const startTime = Date.now();
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal')) return;

    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReq = "Binary Payload";
    
    // Auto-Decrypt MajorLogin Request
    if (req.path.includes('MajorLogin') && reqBuffer.length > 0) {
        const dec = decrypt(reqBuffer);
        if (dec && MajorLoginReq) {
            try { parsedReq = JSON.stringify(MajorLoginReq.toObject(MajorLoginReq.decode(dec), {defaults:true}), null, 2); } catch(e) {}
        }
    } else if (req.query && Object.keys(req.query).length > 0) {
        parsedReq = JSON.stringify(req.query, null, 2);
    }

    // Check Local Mock (Version Bypass)
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        res.setHeader('Content-Type', mock.type);
        res.status(mock.status).send(mock.data);
        logTraffic(req.method, req.originalUrl, mock.status, startTime, "LOCAL_BYPASS", "SUCCESS");
        return;
    }

    try {
        const targetUrl = `${GARENA_API}${req.originalUrl.replace(/^\//, '')}`;
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: { 
                ...req.headers, 
                'host': 'loginbp.ggpolarbear.com',
                'accept-encoding': 'identity' // 🔥 FORCE UNCOMPRESSED
            },
            body: reqBuffer.length > 0 ? reqBuffer : undefined
        });

        const resBuffer = Buffer.from(await response.arrayBuffer());
        let parsedRes = `Size: ${resBuffer.length} bytes`;

        // Attempt Response Decode
        if (req.path.includes('MajorLogin') && MajorLoginRes) {
            try { parsedRes = JSON.stringify(MajorLoginRes.toObject(MajorLoginRes.decode(resBuffer), {defaults:true}), null, 2); } catch(e) {}
        }

        response.headers.forEach((v, n) => res.setHeader(n, v));
        res.status(response.status).send(resBuffer);
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReq, parsedRes);

    } catch (e) {
        if (!res.headersSent) res.status(502).end();
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReq, "OFFLINE: " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
