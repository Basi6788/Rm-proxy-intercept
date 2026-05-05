const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 GARENA CORE ENDPOINT
const GARENA_API = 'https://loginbp.ggpolarbear.com';

// 🔑 AES-CBC CONFIGURATION (Matched with your Python Logic)
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogs = [];
let MajorLoginReq, MajorLoginRes;

// ==========================================
// 🧠 1. PROTOBUF LOADER
// ==========================================
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});

// ==========================================
// 🛠️ 2. CRYPTO ENGINE (Python to Node.js)
// ==========================================
function decryptData(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        // Node.js automatically handles PKCS7 unpadding
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) {
        return null;
    }
}

function encryptData(buffer) {
    try {
        const cipher = crypto.createCipheriv(ALGO, AES_KEY, AES_IV);
        // Node.js automatically handles the exact PKCS7 padding your Python script uses
        return Buffer.concat([cipher.update(buffer), cipher.final()]);
    } catch (e) {
        return null;
    }
}

// ==========================================
// 🛡️ 3. LOCAL BYPASS ROUTES
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
            "server_url": "https://rm-proxy-intercept.vercel.app/", // TERA VERCEL LINK
            "is_review_server": false,
            "use_login_optional_download": true,
            "use_background_download": true,
            "use_background_download_lobby": true,
            "country_code": "SG",
            "client_ip": "15.235.211.216",
            "gdpr_version": 0,
            "billboard_msg": "👑 KING AURORA: SYSTEM HACKED",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 🚀 4. THE CORE PROXY INTERCEPTOR
// ==========================================
app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[RAW BINARY]";
    let parsedResLog = "[RAW BINARY]";
    let bufferToForward = reqBuffer;

    // --- CHECK LOCAL BYPASS FIRST ---
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        res.setHeader('Content-Type', mock.type);
        res.status(mock.status).send(mock.data);
        logTraffic(req.method, req.path, mock.status, startTime, "LOCAL BYPASS", "SUCCESS");
        return;
    }

    // --- INTERCEPT REQUEST ---
    if (reqBuffer.length > 0 && req.path.includes('MajorLogin')) {
        const decryptedReq = decryptData(reqBuffer);
        if (decryptedReq && MajorLoginReq) {
            try {
                const msg = MajorLoginReq.decode(decryptedReq);
                const jsonReq = MajorLoginReq.toObject(msg, { defaults: true, bytes: String });
                parsedReqLog = JSON.stringify(jsonReq, null, 2);
                
                // ⚠️ TO MODIFY DATA IN FUTURE: 
                // jsonReq.device_type = "HackedDevice";
                // const modifiedProto = MajorLoginReq.encode(MajorLoginReq.create(jsonReq)).finish();
                // bufferToForward = encryptData(modifiedProto);
                
            } catch(e) { parsedReqLog = "[REQ PROTO DECODE ERROR] " + e.message; }
        } else {
            parsedReqLog = "[DECRYPTION FAILED] AES Keys did not match.";
        }
    }

    // --- FORWARD TO GARENA ---
    try {
        let pathUrl = req.originalUrl.replace(/^\//, ''); 
        const targetUrl = `${GARENA_API}/${pathUrl}`;

        const headers = { ...req.headers };
        delete headers.host;
        delete headers['accept-encoding']; 
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: bufferToForward.length > 0 ? bufferToForward : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());
        let bufferToClient = resBuffer;

        // --- INTERCEPT RESPONSE ---
        if (resBuffer.length > 0 && req.path.includes('MajorLogin')) {
            const decryptedRes = decryptData(resBuffer);
            if (decryptedRes && MajorLoginRes) {
                try {
                    const msgRes = MajorLoginRes.decode(decryptedRes);
                    const jsonRes = MajorLoginRes.toObject(msgRes, { defaults: true, bytes: String });
                    parsedResLog = JSON.stringify(jsonRes, null, 2);
                    
                    // ⚠️ TO INJECT SKINS/BUNDLES IN FUTURE:
                    // jsonRes.token = "MODIFIED_TOKEN";
                    // const modifiedResProto = MajorLoginRes.encode(MajorLoginRes.create(jsonRes)).finish();
                    // bufferToClient = encryptData(modifiedResProto);

                } catch(e) { parsedResLog = "[RES PROTO DECODE ERROR] " + e.message; }
            } else {
                parsedResLog = "[RES DECRYPTION FAILED] Different key used by server?";
            }
        } else if (resBuffer.length > 0) {
            parsedResLog = `[ENCRYPTED] Size: ${resBuffer.length} bytes`;
        }

        // --- SEND BACK TO GAME ---
        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        res.status(response.status).send(bufferToClient);
        
        logTraffic(req.method, req.path, response.status, startTime, parsedReqLog, parsedResLog);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("GATEWAY ERROR");
        logTraffic(req.method, req.path, 502, startTime, parsedReqLog, "[API ERROR] " + e.message);
    }
});

// ==========================================
// 📊 5. LOGGING & DASHBOARD
// ==========================================
function logTraffic(method, path, status, startTime, reqData, resData) {
    requestLogs.unshift({
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    });
    if (requestLogs.length > 50) requestLogs.pop();
}

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Aurora Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .aurora-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; line-height: 1.5; }
        </style>
    </head>
    <body class="min-h-screen p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#030008] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex justify-between items-center pb-4 mb-6 border-b border-purple-500/20">
                <div class="flex items-center gap-4">
                    <button class="p-2 bg-purple-900/30 rounded-full border border-purple-500/50">
                        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <div>
                        <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase">KING_NEXUS</h1>
                        <p class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1">Full MITM Engine Active</p>
                    </div>
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
                    let isError = log.status >= 400;
                    let borderClass = isError ? 'border-red-500/30' : 'border-purple-500/30 aurora-glow';
                    html += \`
                    <div class="bg-black/60 backdrop-blur-md rounded-xl p-4 border \${borderClass} transition-all">
                        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-purple-300 font-bold text-xs tracking-wide">\${log.path}</span>
                            </div>
                            <span class="\${isError ? 'text-red-400 bg-red-900/30' : 'text-emerald-400 bg-emerald-900/30'} text-xs font-black px-2 py-1 rounded">\${log.status}</span>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">DECRYPTED REQUEST</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="text-purple-400/90">\${log.req}</pre></div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">DECRYPTED RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="\${isError ? 'text-red-400/80' : 'text-gray-400/80'}">\${log.res}</pre></div>
                            </div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html;
            }
            setInterval(async () => {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    if(JSON.stringify(localLogs) !== JSON.stringify(serverLogs)) { localLogs = serverLogs; render(); }
                } catch(e) {}
            }, 1000);
        </script>
    </body>
    </html>
    `);
});

app.listen(process.env.PORT || 3000);
