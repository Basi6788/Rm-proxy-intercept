const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
// Speed Optimization: Sirf POST/PUT ki body parse hogi
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        express.raw({ type: '*/*', limit: '50mb' })(req, res, next);
    } else {
        next();
    }
});

const GARENA_API = 'https://loginbp.ggpolarbear.com';
const PYTHON_API = 'https://protos-gray.vercel.app/api/decode'; // 🐍 TUMHARI PYTHON API

const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogsBuffer = []; 

// ==========================================
// 🗺️ 1. PATH TO PROTO MAPPING (Edit this for new protos)
// ==========================================
// Yahan hum batate hain ke kis URL path par konsa proto message use hoga
const PROTO_ROUTES = {
    'MajorLogin': { req: 'LoginReq', res: 'LoginRes', encrypt: true },
    'PlatformRegister': { req: 'PlatformRegisterReq', res: null, encrypt: false },
    'GetPlayerPersonalShow': { req: 'GetPlayerPersonalShow', res: 'AccountPersonalShowInfo', encrypt: false },
    'SearchWorkshopCode': { req: 'SearchWorkshopCode', res: null, encrypt: false },
    'like': { req: 'like', res: 'Info', encrypt: false },
    'Ping': { req: null, res: null, encrypt: true } // Ping mostly encrypted text hota hai
};

// ==========================================
// 🛠️ 2. SMART CRYPTO ENGINE & PYTHON BRIDGE
// ==========================================
function smartDecrypt(buffer) {
    if (!buffer || buffer.length === 0) return null;
    // FreeFire wale kabhi kabhi shuru me 2 ya 4 bytes ka header lagate hain
    const offsets = [0, 2, 4];
    for (let offset of offsets) {
        if (buffer.length <= offset) continue;
        try {
            const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
            return Buffer.concat([decipher.update(buffer.slice(offset)), decipher.final()]);
        } catch (e) {}
    }
    return null;
}

// Ye function Node.js ka data Python API ko bhej kar JSON wapis lata hai
async function decodeWithPython(msgName, buffer) {
    if (!buffer || buffer.length === 0) return "[EMPTY DATA]";
    try {
        const response = await fetch(PYTHON_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                msg_name: msgName,
                data: buffer.toString('base64')
            })
        });
        const result = await response.json();
        if (result.success) return JSON.stringify(result.data, null, 2);
        
        return `[PYTHON DECODE FAIL: ${result.error}]\n[HEX] ${buffer.toString('hex').slice(0, 200)}...`;
    } catch (e) {
        return `[PYTHON API OFFLINE or TIMEOUT]\n[HEX] ${buffer.toString('hex').slice(0, 200)}...`;
    }
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
// 🛡️ 3. LOCAL MOCKS (VER.PHP)
// ==========================================
const LOCAL_RESPONSES = {
    "/ver.php": {
        status: 200, type: 'application/json',
        data: Buffer.from(JSON.stringify({
            "code": 0, "is_server_open": true, "is_firewall_open": false,
            "cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "backup_cdn_url": "https://dl.gmc.freefiremobile.com/live/ABHotUpdates/",
            "abhotupdate_cdn_url": "https://core-gmc.freefiremobile.com/live/ABHotUpdates/",
            "img_cdn_url": "https://dl.gmc.freefiremobile.com/common/",
            "login_download_optionalpack": "optionalclothres:shaders|optionalpetres:optionalpetres_commonab_shader|optionallobbyres:",
            "need_track_hotupdate": true, "abhotupdate_check": "cache_res;assetindexer;SH-Gpp",
            "latest_release_version": "OB53", "min_hint_size": 1, "space_required_in_GB": 1.48,
            "should_check_ab_load": false, "force_refresh_restype": "optionalavatarres",
            "remote_version": "1.123.10", "server_url": "https://rm-proxy-intercept.vercel.app/", 
            "is_review_server": false, "use_login_optional_download": true,
            "use_background_download": true, "use_background_download_lobby": true,
            "country_code": "SG", "client_ip": "15.235.211.216", "gdpr_version": 0,
            "billboard_msg": "👑 KING AURORA V4: HYBRID ENGINE",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefireth",
            "garena_login": false, "garena_hint": false
        }))
    }
};

// ==========================================
// 🚀 4. API & DASHBOARD ROUTES
// ==========================================
app.get('/', (req, res) => res.redirect('/romeo/ds'));
app.get('/api/internal/logs/sync', (req, res) => {
    const logsToSend = [...requestLogsBuffer];
    requestLogsBuffer = []; res.json(logsToSend);
});
app.post('/api/internal/clear', (req, res) => { requestLogsBuffer = []; res.json({ success: true }); });
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/favicon.png', (req, res) => res.status(204).end());

// ==========================================
// 👑 5. THE HYBRID DASHBOARD UI
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>👑 King Nexus | V4 Hybrid Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            ::-webkit-scrollbar { width: 4px; height: 4px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .aurora-glow { box-shadow: 0 0 15px rgba(139, 92, 246, 0.4); border: 1px solid rgba(139, 92, 246, 0.5); }
            .glass-panel { background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(139, 92, 246, 0.2); }
        </style>
    </head>
    <body class="p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/10 via-[#030008] to-black min-h-screen">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col md:flex-row justify-between items-center pb-4 mb-4 border-b border-purple-500/20 gap-4">
                <div class="flex items-center gap-4">
                    <div class="p-3 bg-purple-900/30 rounded-lg aurora-glow">
                        <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase" style="font-family: 'Orbitron', sans-serif;">KING_NEXUS V4</h1>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">🐍 PYTHON API CONNECTED</p>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-center">
                    <input type="text" id="searchBox" oninput="filterLogs()" placeholder="🔍 Search path, status..." class="px-3 py-2 bg-black/50 border border-purple-500/30 rounded-md text-xs text-white focus:outline-none w-48">
                    <button onclick="copyAllLogs(this)" class="px-3 py-2 bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider aurora-glow">📋 COPY ALL</button>
                    <button onclick="nukeEverything()" class="px-3 py-2 bg-red-950 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider">🗑️ NUKE</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-4"></div>
        </div>

        <script>
            const db = new Dexie("NexusV4DB");
            db.version(1).stores({ logs: 'id, timestamp, method, path, status, duration' });
            let currentLogs = [];

            async function syncServerData() {
                try {
                    const res = await fetch('/api/internal/logs/sync');
                    const newLogs = await res.json();
                    if(newLogs.length > 0) { await db.logs.bulkPut(newLogs); updateUI(); }
                } catch(e) {}
            }

            async function nukeEverything() { 
                if(confirm("⚠ WARNING: Delete all logs?")) {
                    await fetch('/api/internal/clear', { method: 'POST' }); 
                    await db.logs.clear(); updateUI(); 
                }
            }

            async function copyAllLogs(btn) {
                const allLogs = await db.logs.orderBy('id').reverse().toArray();
                if(allLogs.length === 0) return;
                navigator.clipboard.writeText(JSON.stringify(allLogs, null, 2)).then(() => {
                    const orig = btn.innerText; btn.innerText = '✅ COPIED';
                    setTimeout(() => btn.innerText = orig, 2000);
                });
            }

            function filterLogs() {
                const term = document.getElementById('searchBox').value.toLowerCase();
                const filtered = currentLogs.filter(l => l.path.toLowerCase().includes(term) || String(l.status).includes(term) || l.method.toLowerCase().includes(term));
                renderLogsHTML(filtered);
            }

            async function updateUI() {
                currentLogs = await db.logs.orderBy('id').reverse().toArray();
                filterLogs(); 
            }

            function renderLogsHTML(logsArray) {
                const container = document.getElementById('logs-container');
                container.innerHTML = logsArray.map(log => {
                    let isError = log.status >= 400;
                    let isSuccess = log.status >= 200 && log.status < 300;
                    let statusColor = isError ? 'text-red-400 bg-red-900/30 border-red-500/50' : (isSuccess ? 'text-green-400 bg-green-900/30 border-green-500/50' : 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50');
                    return \`
                    <div class="glass-panel rounded-xl p-3 sm:p-4 transition-all \${isError ? 'border-red-500/30' : 'hover:border-purple-500/50'}">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-2 border-b border-white/5 gap-2">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-white font-black text-[10px] bg-white/10 px-2 py-1 rounded border border-white/10">\${log.method}</span>
                                <span class="text-blue-300 font-bold text-xs tracking-wide break-all">\${log.path}</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-gray-500 text-[9px] font-bold">\${log.timestamp} | \${log.duration}</span>
                                <span class="\${statusColor} border text-[10px] font-black px-2 py-1 rounded">\${log.status}</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div class="relative pt-2">
                                <div class="absolute -top-1 left-2 bg-[#0a0a0f] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700/50">REQUEST</div>
                                <pre class="p-3 bg-[#050508] rounded-lg border border-white/5 h-40 overflow-y-auto mt-1 text-[9px] text-purple-300/80 custom-scroll">\${log.req}</pre>
                            </div>
                            <div class="relative pt-2">
                                <div class="absolute -top-1 left-2 bg-[#0a0a0f] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700/50">RESPONSE</div>
                                <pre class="p-3 bg-[#050508] rounded-lg border border-white/5 h-40 overflow-y-auto mt-1 text-[9px] \${isError ? 'text-red-300/80' : 'text-emerald-300/80'} custom-scroll">\${log.res}</pre>
                            </div>
                        </div>
                    </div>\`;
                }).join('');
            }
            setInterval(syncServerData, 1500); updateUI(); 
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🌌 6. CATCH-ALL PROXY INTERCEPTOR 
// ==========================================
app.all('*', async (req, res) => {
    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[EMPTY OR RAW BINARY]";
    let parsedResLog = "[EMPTY OR RAW BINARY]";

    // --- 🛑 1. CHECK LOCAL BYPASS (VER.PHP) ---
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        parsedReqLog = Object.keys(req.query).length > 0 ? JSON.stringify(req.query, null, 2) : "LOCAL BYPASS TRIGGERED";
        res.setHeader('Content-Type', mock.type);
        res.status(mock.status).send(mock.data);
        logTraffic(req.method, req.originalUrl, mock.status, startTime, parsedReqLog, JSON.stringify(JSON.parse(mock.data.toString()), null, 2));
        return;
    }

    // --- 🔍 2. ROUTE MATCHING (Identify Proto) ---
    // Check if the current URL matches any known proto mapping
    const matchedRouteKey = Object.keys(PROTO_ROUTES).find(key => req.path.includes(key));
    const routeConfig = matchedRouteKey ? PROTO_ROUTES[matchedRouteKey] : null;

    // --- 📤 3. INTERCEPT & PARSE REQUEST ---
    if (reqBuffer.length > 0) {
        let bufferToProcess = reqBuffer;

        // AES Decryption agar zaroori hai (e.g. MajorLogin)
        if (routeConfig && routeConfig.encrypt) {
            const decrypted = smartDecrypt(reqBuffer);
            if (decrypted) bufferToProcess = decrypted;
        }

        // Send to Python API if we have a msg_name for request
        if (routeConfig && routeConfig.req) {
            parsedReqLog = await decodeWithPython(routeConfig.req, bufferToProcess);
        } else {
            // Fallback (Text ya HEX)
            let tryString = bufferToProcess.toString('utf8');
            if (/^[\x20-\x7E]*$/.test(tryString) && tryString.length > 5) {
                parsedReqLog = tryString.slice(0, 3000);
            } else {
                parsedReqLog = `[RAW BINARY / UNKNOWN PROTO] Size: ${bufferToProcess.length} bytes\n[HEX] ${bufferToProcess.toString('hex').match(/.{1,32}/g)?.join('\n') || ''}`;
            }
        }
    } else if (Object.keys(req.query).length > 0) {
        parsedReqLog = JSON.stringify(req.query, null, 2);
    }

    // --- 🌐 4. FORWARD TO REAL GARENA SERVER ---
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

        // --- 📥 5. INTERCEPT & PARSE RESPONSE ---
        if (resBuffer.length > 0) {
            // Python API se Decode karwao agar Res proto mapped hai
            if (routeConfig && routeConfig.res) {
                parsedResLog = await decodeWithPython(routeConfig.res, resBuffer);
            } else {
                // Normal JSON ya Raw Text Fallback
                try {
                    parsedResLog = JSON.stringify(JSON.parse(resBuffer.toString('utf8')), null, 2);
                } catch {
                    let text = resBuffer.toString('utf8');
                    if (/^[\x20-\x7E\n\r]*$/.test(text) && text.length > 5) {
                        parsedResLog = text.length < 5000 ? text : `[TEXT RESPONSE] Size: ${resBuffer.length} bytes`;
                    } else {
                        parsedResLog = `[RAW BINARY RESPONSE] Size: ${resBuffer.length} bytes\n[HEX] ${resBuffer.toString('hex').match(/.{1,32}/g)?.join('\n') || ''}`;
                    }
                }
            }
        }

        // Send back to Game Client
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
