const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

// 🔥 RAW BODY CAPTURE FOR SNIFFING & INJECTING
app.use(express.raw({ type: '*/*', limit: '500mb' }));

// 🌐 GARENA MASTER SERVERS & YOUR URL
const MY_PROXY_URL = 'https://rm-proxy-intercept.vercel.app'; // 🚀 TERA VERCEL URL
const SERVERS = {
    LOGIN: 'loginbp.ggpolarbear.com',
    CLIENT: 'clientbp.ggpolarbear.com',
    DL: 'dl.castle.freefiremobile.com'
};

const PYTHON_API = 'https://protos-gray.vercel.app'; 

const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogsBuffer = []; 

// ==========================================
// 🗺️ 1. THE ROUTER MAP
// ==========================================
const ROUTE_MAP = {
    'MajorLogin': { req: 'LoginReq', res: 'LoginRes', encrypt: true, target: SERVERS.LOGIN },
    'PlatformRegister': { req: 'PlatformRegisterReq', res: null, encrypt: false, target: SERVERS.LOGIN },
    'GetAccountBriefInfoBeforeLogin': { req: null, res: null, encrypt: true, target: SERVERS.LOGIN },
    'Ping': { req: null, res: null, encrypt: true, target: SERVERS.LOGIN },

    'GetPlayerPersonalShow': { req: 'GetPlayerPersonalShow', res: 'AccountPersonalShowInfo', encrypt: false, target: SERVERS.CLIENT },
    'GetPlayerProfile': { req: null, res: null, encrypt: true, target: SERVERS.CLIENT },
    'SearchWorkshopCode': { req: 'SearchWorkshopCode', res: null, encrypt: false, target: SERVERS.CLIENT },
    'like': { req: 'like', res: 'Info', encrypt: false, target: SERVERS.CLIENT },
    'GetFriendList': { req: null, res: null, encrypt: true, target: SERVERS.CLIENT },
    'GetVault': { req: null, res: null, encrypt: true, target: SERVERS.CLIENT },
    'SyncInventory': { req: null, res: null, encrypt: true, target: SERVERS.CLIENT },
    
    'ABHotUpdates': { req: null, res: null, encrypt: false, target: SERVERS.DL },
    'common': { req: null, res: null, encrypt: false, target: SERVERS.DL }
};

// ==========================================
// 🛠️ 2. SMART CRYPTO ENGINE (WITH PREFIX HANDLING)
// ==========================================
function smartDecrypt(buffer) {
    if (!buffer || buffer.length === 0) return { dec: null, prefix: Buffer.alloc(0) };
    const offsets = [0, 2, 4];
    for (let offset of offsets) {
        if (buffer.length <= offset) continue;
        try {
            const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
            const dec = Buffer.concat([decipher.update(buffer.slice(offset)), decipher.final()]);
            return { dec, prefix: buffer.slice(0, offset) };
        } catch (e) {}
    }
    return { dec: null, prefix: Buffer.alloc(0) };
}

function encryptData(buffer, prefix) {
    try {
        const cipher = crypto.createCipheriv(ALGO, AES_KEY, AES_IV);
        const enc = Buffer.concat([cipher.update(buffer), cipher.final()]);
        return Buffer.concat([prefix, enc]); // Wapas prefix laga do taake binary corrupt na ho
    } catch (e) { return null; }
}

async function decodeWithPythonRaw(msgName, buffer) {
    if (!buffer || buffer.length === 0) return null;
    try {
        const response = await fetch(`${PYTHON_API}/api/decode`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_name: msgName, data: buffer.toString('base64') })
        });
        const result = await response.json();
        return result.success ? result.data : null;
    } catch (e) { return null; }
}

async function encodeWithPythonRaw(msgName, jsonData) {
    try {
        const response = await fetch(`${PYTHON_API}/api/encode`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ msg_name: msgName, data: jsonData })
        });
        const result = await response.json();
        return result.success ? Buffer.from(result.data, 'base64') : null;
    } catch (e) { return null; }
}

// ==========================================
// 🚀 3. API & DASHBOARD ROUTES
// ==========================================
app.get('/api/internal/logs/sync', (req, res) => {
    const logsToSend = [...requestLogsBuffer];
    requestLogsBuffer = []; res.json(logsToSend);
});
app.post('/api/internal/clear', (req, res) => { requestLogsBuffer = []; res.json({ success: true }); });
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>👑 King Nexus | V9 Hijacker Engine</title>
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
                        <h1 class="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase" style="font-family: 'Orbitron', sans-serif;">KING_NEXUS V9</h1>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <p id="storage-status" class="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">💉 ACTIVE INJECTION MODE</p>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 items-center justify-center">
                    <input type="text" id="searchBox" oninput="fullRender()" placeholder="🔍 Search logs..." class="px-3 py-2 bg-black/50 border border-purple-500/30 rounded-md text-xs text-white focus:outline-none w-48">
                    <button onclick="nukeEverything()" class="px-3 py-2 bg-red-950 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white transition-all text-[10px] font-black rounded-md tracking-wider">🗑️ CLEAR</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-4"></div>
        </div>

        <script>
            const db = new Dexie("NexusV9DB");
            db.version(1).stores({ logs: 'id, timestamp, method, targetHost, path, status, duration' });

            async function syncServerData() {
                try {
                    const res = await fetch('/api/internal/logs/sync');
                    const newLogs = await res.json();
                    if(newLogs.length > 0) { 
                        await db.logs.bulkPut(newLogs); 
                        if(document.getElementById('searchBox').value.trim() === "") appendNewLogs(newLogs); 
                        else fullRender(); 
                    }
                } catch(e) {}
            }

            function generateLogHTML(log) {
                let isError = log.status >= 400;
                let statusColor = isError ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30';
                return \`
                <div class="glass-panel rounded-xl p-3 sm:p-4 transition-all \${isError ? 'border-red-500/30' : 'border-purple-500/30 aurora-glow'}">
                    <div class="flex justify-between items-center mb-3 pb-2 border-b border-white/5 gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-white font-black text-[10px] bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                            <span class="text-blue-300 font-bold text-xs break-all">[\${log.targetHost}] \${log.path}</span>
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
            }

            function appendNewLogs(newLogs) { document.getElementById('logs-container').insertAdjacentHTML('afterbegin', newLogs.map(generateLogHTML).join('')); }
            async function fullRender() {
                const term = document.getElementById('searchBox').value.toLowerCase();
                let logs = await db.logs.orderBy('id').reverse().toArray();
                if(term) logs = logs.filter(l => l.path.toLowerCase().includes(term) || String(l.status).includes(term) || l.targetHost.toLowerCase().includes(term));
                document.getElementById('logs-container').innerHTML = logs.map(generateLogHTML).join('');
            }
            async function nukeEverything() { await fetch('/api/internal/clear', { method: 'POST' }); await db.logs.clear(); document.getElementById('logs-container').innerHTML = ''; }
            setInterval(syncServerData, 1000); fullRender(); 
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🌌 4. CATCH-ALL HYBRID INTERCEPTOR (ASYNC + SYNC INJECTION)
// ==========================================
app.all('*', async (req, res) => {
    if (req.path === '/') return res.redirect('/romeo/ds');

    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    // --- 🛑 1. CHECK LOCAL BYPASS ---
    if (req.originalUrl.includes('/ver.php')) {
        const mockData = {
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
            "billboard_msg": "👑 KING AURORA V9: HIJACKER",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefireth",
            "garena_login": false, "garena_hint": false
        };
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(mockData); 
    }

    // --- 🌐 2. DYNAMIC HOST DETECTION ---
    let pathUrl = req.originalUrl.replace(/^\//, ''); 
    const matchedRouteKey = Object.keys(ROUTE_MAP).find(key => req.originalUrl.includes(key));
    const routeConfig = matchedRouteKey ? ROUTE_MAP[matchedRouteKey] : null;
    
    let targetHost = (routeConfig && routeConfig.target) ? routeConfig.target : SERVERS.CLIENT;
    if (req.headers['x-target-host']) targetHost = req.headers['x-target-host'];
    
    const targetUrl = `https://${targetHost}/${pathUrl}`;

    try {
        const headers = { ...req.headers };
        headers['host'] = targetHost; 
        delete headers['accept-encoding']; 
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const garenaResponse = await fetch(targetUrl, {
            method: req.method, headers: headers,
            body: (req.method !== 'GET' && req.method !== 'HEAD' && reqBuffer.length > 0) ? reqBuffer : undefined
        });

        let resBuffer = Buffer.from(await garenaResponse.arrayBuffer());
        let modifiedResLog = null; // Agar hum modify karenge toh dashboard ke liye yahan save karenge

        // ========================================================
        // 💉 3. ACTIVE INJECTION ZONE (BLOCKING FOR MAJORLOGIN)
        // ========================================================
        if (req.originalUrl.includes('MajorLogin') && resBuffer.length > 0) {
            console.log("💉 Intercepted MajorLogin, preparing injection...");
            const { dec: decryptedRes, prefix } = smartDecrypt(resBuffer);
            
            if (decryptedRes) {
                let jsonRes = await decodeWithPythonRaw('LoginRes', decryptedRes);
                
                if (jsonRes && jsonRes.server_url) {
                    const oldUrl = jsonRes.server_url;
                    jsonRes.server_url = MY_PROXY_URL; // 🔥 HIJACK!
                    modifiedResLog = JSON.stringify(jsonRes, null, 2);
                    
                    console.log(`✅ Injecting URL: ${oldUrl} -> ${MY_PROXY_URL}`);

                    let reEncodedBin = await encodeWithPythonRaw('LoginRes', jsonRes);
                    if (reEncodedBin) {
                        let reEncryptedBin = encryptData(reEncodedBin, prefix);
                        if (reEncryptedBin) {
                            resBuffer = reEncryptedBin; // 🔥 OVERWRITE ORIGINAL BUFFER
                        }
                    }
                }
            }
        }

        // --- ⏩ 4. FORWARD TO GAME CLIENT ---
        garenaResponse.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) res.setHeader(n, v);
        });
        res.status(garenaResponse.status).send(resBuffer);

        // --- 📥 5. BACKGROUND LOGGING ---
        processAndLog(req.method, targetHost, req.originalUrl, req.query, reqBuffer, resBuffer, garenaResponse.status, startTime, routeConfig, modifiedResLog);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("GATEWAY ERROR");
    }
});

async function processAndLog(method, targetHost, originalUrl, query, reqBuffer, resBuffer, status, startTime, routeConfig, modifiedResLog) {
    let parsedReqLog = "[EMPTY OR RAW BINARY]";
    let parsedResLog = modifiedResLog || "[EMPTY OR RAW BINARY]";

    if (reqBuffer.length > 0) {
        let toDec = (routeConfig && routeConfig.encrypt) ? smartDecrypt(reqBuffer).dec : reqBuffer;
        if (routeConfig && routeConfig.req) {
            let jsonDec = await decodeWithPythonRaw(routeConfig.req, toDec || reqBuffer);
            parsedReqLog = jsonDec ? JSON.stringify(jsonDec, null, 2) : "[DECODE FAIL]";
        } else {
            parsedReqLog = toDec ? toDec.toString('utf8').slice(0, 3000) : "[BINARY]";
        }
    } else if (Object.keys(query).length > 0) {
        parsedReqLog = JSON.stringify(query, null, 2);
    }

    if (!modifiedResLog && resBuffer.length > 0) {
        if (routeConfig && routeConfig.res) {
            let toDec = (routeConfig && routeConfig.encrypt) ? smartDecrypt(resBuffer).dec : resBuffer;
            let jsonDec = await decodeWithPythonRaw(routeConfig.res, toDec || resBuffer);
            parsedResLog = jsonDec ? JSON.stringify(jsonDec, null, 2) : "[DECODE FAIL]";
        } else {
            let text = resBuffer.toString('utf8');
            parsedResLog = /^[\x20-\x7E\n\r]*$/.test(text) ? text.slice(0, 5000) : `[RAW BINARY RESPONSE] Size: ${resBuffer.length}`;
        }
    }

    requestLogsBuffer.push({
        id: Date.now() + '-' + Math.floor(Math.random()*10000),
        timestamp: new Date().toLocaleTimeString(),
        method, targetHost, path: originalUrl, status,
        duration: `${Date.now() - startTime}ms`,
        req: parsedReqLog, res: parsedResLog
    });
}

app.listen(process.env.PORT || 3000);
