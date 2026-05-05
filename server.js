const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 GARENA'S ACTUAL HTTP LOGIN SERVER (Found from your Python script!)
const GARENA_LOGIN_API = 'https://loginbp.ggpolarbear.com'; 

// 🔑 GARENA AES-128-CBC KEYS
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV = Buffer.from('6oyZDr22E3ychjM%', 'utf8');

let requestLogs = []; 

// ==========================================
// 🧠 1. CUSTOM CRYPTO ENGINE
// ==========================================
function decryptPayload(buffer) {
    try {
        const decipher = crypto.createDecipheriv('aes-128-cbc', AES_KEY, AES_IV);
        let decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
        return decrypted;
    } catch (e) {
        return null;
    }
}

function encryptPayload(buffer) {
    try {
        const cipher = crypto.createCipheriv('aes-128-cbc', AES_KEY, AES_IV);
        let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
        return encrypted;
    } catch (e) {
        return null;
    }
}

// ==========================================
// 🧠 2. PROTOBUF DECODER SETUP
// ==========================================
let MajorLoginReq, MajorLoginRes;
protobuf.load("MajorLoginReq.proto", (err, root) => {
    if (!err) MajorLoginReq = root.lookupType("MajorLogin");
});
// Agar tere paas Res proto file bhi hai toh yahan load ho jayegi
protobuf.load("MajorLoginRes.proto", (err, root) => {
    if (!err) MajorLoginRes = root.lookupType("MajorLoginRes");
});

// ==========================================
// 🛠️ THE LOCAL MOCK (ver.php bypass)
// ==========================================
const LOCAL_RESPONSES = {
    "/ver.php": {
        status: 200,
        type: 'application/json',
        data: Buffer.from(JSON.stringify({
            "code": 0,
            "is_server_open": true,
            "is_firewall_open": false,
            "cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "backup_cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "abhotupdate_cdn_url": "https://core-gmc.freefiremobile.com/live/ABHotUpdates/",
            "img_cdn_url": "https://dl.gmc.freefiremobile.com/common/",
            "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
            "need_track_hotupdate": true,
            "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
            "latest_release_version": "OB53",
            "min_hint_size": 1,
            "space_required_in_GB": 1.48,
            "should_check_ab_load": false,
            "force_refresh_restype": "optionalavatarres",
            "remote_version": "2.124.10",
            "server_url": "https://rm-proxy-intercept.vercel.app/", 
            "is_review_server": false,
            "use_login_optional_download": true,
            "use_background_download": true,
            "use_background_download_lobby": true,
            "country_code": "SG",
            "client_ip": "15.235.211.216",
            "gdpr_version": 0,
            "billboard_msg": "👑 ROMEO NEXUS: ASTUTECH CLONE PROXY ACTIVE!",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 🌌 DASHBOARD ROUTE (King Aurora)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 Romeo MITM Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { background-color: #050505; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
            .aurora-glow { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), inset 0 0 10px rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; line-height: 1.5; }
        </style>
    </head>
    <body class="min-h-screen p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-[#050505] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex justify-between items-center pb-4 mb-6 border-b border-emerald-500/20 relative">
                <div>
                    <h1 class="text-3xl font-black text-emerald-400 tracking-widest uppercase">KING_NEXUS</h1>
                    <p class="text-[10px] text-emerald-500/70 font-bold uppercase tracking-[0.3em] mt-1">MITM Decryption Proxy</p>
                </div>
                <button onclick="clearLogs()" class="px-4 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-full tracking-widest">CLEAR LOGS</button>
            </header>
            <div id="logs-container" class="space-y-5"></div>
        </div>
        <script>
            let localLogs = [];
            async function clearLogs() { await fetch('/api/internal/clear', { method: 'POST' }); localLogs = []; render(); }
            function render() {
                const container = document.getElementById('logs-container');
                let html = '';
                localLogs.forEach(log => {
                    let borderClass = log.status >= 400 ? 'border-red-500/30' : 'border-emerald-500/30 aurora-glow';
                    html += \`
                    <div class="bg-black/60 backdrop-blur-md rounded-xl p-4 border \${borderClass} mb-4">
                        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-emerald-300 font-bold text-xs tracking-wide">\${log.path}</span>
                            </div>
                            <span class="\${log.status >= 400 ? 'text-red-400 bg-red-900/30' : 'text-emerald-400 bg-emerald-900/30'} text-xs font-black px-2 py-1 rounded">\${log.status}</span>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700">DECRYPTED REQUEST</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="text-emerald-400/90">\${log.req}</pre></div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700">DECRYPTED RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="\${log.status >= 400 ? 'text-red-400/80' : 'text-gray-400/80'}">\${log.res}</pre></div>
                            </div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html;
            }
            async function sync() {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    if(JSON.stringify(localLogs) !== JSON.stringify(serverLogs)) { localLogs = serverLogs; render(); }
                } catch(e) {}
            }
            setInterval(sync, 1000);
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🚀 THE MITM PROXY ENGINE
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReq = "[RAW HEX] " + reqBuffer.toString('hex').substring(0, 100) + "...";
    let parsedRes = "Waiting...";
    let finalReqBufferToForward = reqBuffer;

    try {
        const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));

        if (localRule) {
            // Local bypass for ver.php
            const mockData = LOCAL_RESPONSES[localRule];
            res.setHeader('Content-Type', mockData.type);
            res.status(mockData.status).send(mockData.data);
            parsedReq = "LOCAL MOCK BYPASS";
            parsedRes = "SUCCESS";
            logTraffic(req.method, req.originalUrl, mockData.status, startTime, parsedReq, parsedRes);
            return;
        }

        // 🔥 STEP 1: DECRYPT & DECODE INCOMING REQUEST
        if (reqBuffer.length > 0 && req.path.includes('/MajorLogin')) {
            const decryptedBuffer = decryptPayload(reqBuffer);
            if (decryptedBuffer && MajorLoginReq) {
                try {
                    const decodedMsg = MajorLoginReq.decode(decryptedBuffer);
                    const jsonObject = MajorLoginReq.toObject(decodedMsg, { defaults: true, bytes: String });
                    parsedReq = JSON.stringify(jsonObject, null, 2);
                    
                    // 💉 HACKING ZONE: Yahan tu JSON modify kar sakta hai
                    // jsonObject.client_ip = "127.0.0.1";
                    
                    // Re-encode & Re-encrypt
                    const newProtoBuffer = MajorLoginReq.encode(MajorLoginReq.create(jsonObject)).finish();
                    const reEncryptedBuffer = encryptPayload(newProtoBuffer);
                    if (reEncryptedBuffer) finalReqBufferToForward = reEncryptedBuffer;

                } catch (e) { parsedReq = "[DECODE FAILED] " + e.message; }
            } else { parsedReq = "[DECRYPTION FAILED] Wrong Key?"; }
        }

        // 🔥 STEP 2: FORWARD TO GARENA
        let pathUrl = req.originalUrl;
        if (pathUrl.startsWith('/')) pathUrl = pathUrl.substring(1); 
        const targetUrl = `${GARENA_LOGIN_API}/${pathUrl}`; 

        const headers = { ...req.headers };
        delete headers.host; 
        delete headers['accept-encoding']; 
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: finalReqBufferToForward.length > 0 ? finalReqBufferToForward : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());
        
        // 🔥 STEP 3: DECRYPT & DECODE GARENA'S RESPONSE
        if (resBuffer.length > 0 && req.path.includes('/MajorLogin')) {
            const decryptedResBuffer = decryptPayload(resBuffer);
            if (decryptedResBuffer && MajorLoginRes) {
                try {
                    const decodedResMsg = MajorLoginRes.decode(decryptedResBuffer);
                    const jsonResObject = MajorLoginRes.toObject(decodedResMsg, { defaults: true, bytes: String });
                    parsedRes = JSON.stringify(jsonResObject, null, 2);
                    
                    // 💉 HACKING ZONE: Modify response from Garena here before sending to game!

                } catch (e) { parsedRes = "[RES DECODE FAILED] " + e.message; }
            } else { parsedRes = "[RES DECRYPTION FAILED]"; }
        } else if (resBuffer.length > 0) {
            parsedRes = "[RAW HEX] " + resBuffer.toString('hex').substring(0, 100) + "...";
        }

        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        
        res.status(response.status).send(resBuffer);
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReq, parsedRes);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("Bad Gateway");
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReq, "[ERROR] " + e.message);
    }
});

function logTraffic(method, path, status, startTime, reqData, resData) {
    requestLogs.unshift({
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    });
    if (requestLogs.length > 50) requestLogs.pop();
}

module.exports = app;
