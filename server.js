const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '500mb' })); 

const GARENA_API = 'https://loginbp.ggpolarbear.com';

const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogsBuffer = []; 
let MajorLoginReq, MajorLoginRes;

// ==========================================
// 🧠 1. PROTOBUF LOADER
// ==========================================
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});

// ==========================================
// 🛠️ 2. CRYPTO & LOGGING
// ==========================================
function decryptRequest(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) { return null; }
}

function logTraffic(method, path, status, startTime, reqData, resData) {
    const newLog = {
        id: Date.now() + '-' + Math.floor(Math.random() * 100000),
        timestamp: new Date().toLocaleTimeString(),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    };
    requestLogsBuffer.push(newLog); 
    if (requestLogsBuffer.length > 2000) requestLogsBuffer.shift(); 
}

// ==========================================
// 🛡️ 3. LOCAL MOCKS (VER.PHP BYPASS ADDED BACK)
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
            "remote_version": "1.123.10", 
            "server_url": "https://rm-proxy-intercept.vercel.app/", 
            "is_review_server": false,
            "use_login_optional_download": true,
            "use_background_download": true,
            "use_background_download_lobby": true,
            "country_code": "SG",
            "client_ip": "15.235.211.216",
            "gdpr_version": 0,
            "billboard_msg": "👑 KING AURORA: OFFICIAL APK BYPASSED",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefireth",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 🚀 4. API & DASHBOARD ROUTES
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 20%; background-color: #050505; color: #00ff88; padding: 50px; border-radius: 20px;">
            <h1 style="font-size: 3rem; margin-bottom: 10px;">KING NEXUS ACTIVE 🚀</h1>
            <p style="color: #8b5cf6;">Full Traffic Interception is Live.</p>
            <br>
            <a href="/romeo/ds" style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 1.2rem;">Enter Pro Dashboard</a>
        </div>
        <style>body { background: #000; margin: 0; display: flex; justify-content: center; height: 100vh; }</style>
    `);
});

app.get('/api/internal/logs/sync', (req, res) => {
    const logsToSend = [...requestLogsBuffer];
    requestLogsBuffer = []; 
    res.json(logsToSend);
});

app.post('/api/internal/clear', (req, res) => { 
    requestLogsBuffer = []; 
    res.json({ success: true }); 
});

// Ignores useless image requests to keep logs clean
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// ==========================================
// 👑 5. THE PRO DASHBOARD (HTML/JS)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Nexus | Pro Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #050505; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .aurora-glow { box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); border: 1px solid rgba(139, 92, 246, 0.5); }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 10px; line-height: 1.4; color: #a78bfa; }
            .glass-panel { background: rgba(10, 10, 15, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
        </style>
    </head>
    <body class="min-h-screen p-2 sm:p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-[#030008] to-black">
        <div class="max-w-[95%] mx-auto">
            <header class="flex flex-col md:flex-row justify-between items-center pb-4 mb-4 border-b border-purple-500/20 gap-4">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-purple-900/30 rounded-lg aurora-glow">
                        <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase" style="font-family: 'Orbitron', sans-serif;">KING_NEXUS</h1>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p id="storage-status" class="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Syncing...</p>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-center">
                    <input type="text" id="searchBox" oninput="filterLogs()" placeholder="🔍 Search path, status..." class="px-3 py-2 bg-black/50 border border-purple-500/30 rounded-md text-xs text-white focus:outline-none focus:border-purple-500 w-48">
                    <button onclick="downloadJSON()" class="px-3 py-2 bg-blue-900/30 text-blue-300 border border-blue-500/50 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider">💾 EXPORT</button>
                    <button onclick="copyAllLogs(this)" class="px-3 py-2 bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider aurora-glow">📋 COPY ALL</button>
                    <button onclick="nukeEverything()" class="px-3 py-2 bg-red-950 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider">🗑️ NUKE</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-4"></div>
        </div>

        <script>
            const db = new Dexie("NexusProDB");
            db.version(1).stores({ logs: 'id, timestamp, method, path, status, duration' });
            let currentLogs = [];

            async function syncServerData() {
                try {
                    const res = await fetch('/api/internal/logs/sync');
                    const newLogs = await res.json();
                    if(newLogs.length > 0) {
                        await db.logs.bulkPut(newLogs);
                        updateUI();
                    }
                } catch(e) {}
            }

            async function nukeEverything() { 
                if(confirm("⚠ WARNING: Ye database aur server se har cheez delete kar dega. Continue?")) {
                    await fetch('/api/internal/clear', { method: 'POST' }); 
                    await db.logs.clear();
                    updateUI(); 
                }
            }

            async function copyAllLogs(btn) {
                const allLogs = await db.logs.orderBy('id').reverse().toArray();
                if(allLogs.length === 0) return alert("Logs empty!");
                navigator.clipboard.writeText(JSON.stringify(allLogs, null, 2)).then(() => {
                    btn.innerText = '✅ COPIED';
                    setTimeout(() => btn.innerText = '📋 COPY ALL', 2000);
                });
            }

            async function downloadJSON() {
                const allLogs = await db.logs.orderBy('id').reverse().toArray();
                if(allLogs.length === 0) return alert("Logs empty!");
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allLogs, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "nexus_logs_" + Date.now() + ".json");
                dlAnchorElem.click();
            }

            function filterLogs() {
                const term = document.getElementById('searchBox').value.toLowerCase();
                const filtered = currentLogs.filter(l => 
                    l.path.toLowerCase().includes(term) || 
                    String(l.status).includes(term) || 
                    l.method.toLowerCase().includes(term)
                );
                renderLogsHTML(filtered);
            }

            async function updateUI() {
                currentLogs = await db.logs.orderBy('id').reverse().toArray();
                document.getElementById('storage-status').innerText = currentLogs.length + " LOGS SECURED IN VAULT";
                filterLogs(); 
            }

            function renderLogsHTML(logsArray) {
                const container = document.getElementById('logs-container');
                let html = '';
                
                logsArray.forEach(log => {
                    let isError = log.status >= 400;
                    let isSuccess = log.status >= 200 && log.status < 300;
                    let statusColor = isError ? 'text-red-400 bg-red-900/30 border-red-500/50' : (isSuccess ? 'text-green-400 bg-green-900/30 border-green-500/50' : 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50');
                    let borderClass = isError ? 'border-red-500/30' : 'border-purple-500/20 aurora-glow';
                    
                    html += \`
                    <div class="glass-panel rounded-xl p-4 transition-all hover:border-purple-500/50 \${borderClass}">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-2 border-b border-white/5 gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-white font-black text-[10px] bg-white/10 px-2 py-1 rounded border border-white/10">\${log.method}</span>
                                <span class="text-blue-300 font-bold text-xs tracking-wide break-all">\${log.path}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-gray-500 text-[9px] font-bold">\${log.timestamp} | \${log.duration}</span>
                                <span class="\${statusColor} border text-[10px] font-black px-2 py-1 rounded shadow-sm">\${log.status}</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div class="relative group">
                                <div class="absolute -top-2 left-3 bg-[#0a0a0f] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700/50 z-10">REQUEST</div>
                                <div class="p-3 bg-[#050508] rounded-lg border border-white/5 h-40 overflow-y-auto mt-1 custom-scroll"><pre class="text-purple-300/80 group-hover:text-purple-300 transition-colors">\${log.req}</pre></div>
                            </div>
                            <div class="relative group">
                                <div class="absolute -top-2 left-3 bg-[#0a0a0f] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700/50 z-10">RESPONSE</div>
                                <div class="p-3 bg-[#050508] rounded-lg border border-white/5 h-40 overflow-y-auto mt-1 custom-scroll"><pre class="\${isError ? 'text-red-300/80' : 'text-emerald-300/80'} group-hover:brightness-125 transition-colors">\${log.res}</pre></div>
                            </div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html;
            }

            setInterval(syncServerData, 1500);
            updateUI(); 
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🌌 6. CATCH-ALL PROXY INTERCEPTOR (REAL TRAFFIC & MOCKS)
// ==========================================
app.all('*', async (req, res) => {
    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[EMPTY OR RAW BINARY]";
    let parsedResLog = "[EMPTY OR RAW BINARY]";

    // --- 🛑 CHECK LOCAL BYPASS FIRST (MOCK) ---
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        
        // Agar query parameters aaye hain to unhe request log me dikhaye
        if (Object.keys(req.query).length > 0) {
            parsedReqLog = JSON.stringify(req.query, null, 2);
        } else {
            parsedReqLog = "LOCAL BYPASS TRIGGERED";
        }

        res.setHeader('Content-Type', mock.type);
        res.status(mock.status).send(mock.data);
        
        logTraffic(req.method, req.originalUrl, mock.status, startTime, parsedReqLog, JSON.stringify(JSON.parse(mock.data.toString()), null, 2));
        return; // Yahan ruk jao, real server par na bhejo
    }

    // --- INTERCEPT & PARSE REQUEST (IF NOT MOCKED) ---
    if (reqBuffer.length > 0) {
        if (req.path.includes('MajorLogin')) {
            const decryptedReq = decryptRequest(reqBuffer);
            if (decryptedReq && MajorLoginReq) {
                try {
                    const msg = MajorLoginReq.decode(decryptedReq);
                    const jsonReq = MajorLoginReq.toObject(msg, { defaults: true, bytes: String });
                    parsedReqLog = JSON.stringify(jsonReq, null, 2);
                } catch(e) { parsedReqLog = "[REQ PROTO DECODE ERROR] " + e.message; }
            } else {
                parsedReqLog = "[DECRYPTION FAILED] AES Keys did not match.";
            }
        } else {
            let tryString = reqBuffer.toString('utf8');
            parsedReqLog = tryString.length > 5 ? tryString.slice(0, 3000) : `[RAW BINARY] Size: ${reqBuffer.length} bytes`;
        }
    } else if (Object.keys(req.query).length > 0) {
        parsedReqLog = JSON.stringify(req.query, null, 2);
    }

    // --- FORWARD TO REAL GARENA SERVER ---
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
            body: (req.method !== 'GET' && req.method !== 'HEAD' && reqBuffer.length > 0) ? reqBuffer : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());

        // --- INTERCEPT & PARSE RESPONSE ---
        if (resBuffer.length > 0) {
            if (req.path.includes('MajorLogin')) {
                if (MajorLoginRes) {
                    try {
                        const msgRes = MajorLoginRes.decode(resBuffer);
                        const jsonRes = MajorLoginRes.toObject(msgRes, { defaults: true, bytes: String });
                        parsedResLog = JSON.stringify(jsonRes, null, 2);
                    } catch(e) { parsedResLog = "[RES PROTO DECODE ERROR] " + e.message; }
                } else {
                    parsedResLog = "[RES DECODE FAILED] Proto missing.";
                }
            } else {
                try {
                    parsedResLog = JSON.stringify(JSON.parse(resBuffer.toString('utf8')), null, 2);
                } catch {
                    let text = resBuffer.toString('utf8');
                    parsedResLog = text.length > 5 && text.length < 10000 ? text : `[RAW BINARY] Size: ${resBuffer.length} bytes`;
                }
            }
        }

        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        res.status(response.status).send(resBuffer);
        
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReqLog, parsedResLog);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("GATEWAY ERROR");
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReqLog, "[GATEWAY FAILED] " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
