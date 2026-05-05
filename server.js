const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 GARENA CORE ENDPOINT
const GARENA_API = 'https://loginbp.ggpolarbear.com';

// 🔑 AES-128-CBC CONFIGURATION
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogs = [];
let MajorLoginReq, MajorLoginRes, GetOutfitRes;

// ==========================================
// 🧠 1. PROTOBUF LOADER (Catching Inventory Too)
// ==========================================
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});
// Inventory monitor karne ke liye
protobuf.load("GetOutfit.proto").then(r => GetOutfitRes = r.lookupType("CSGetOutfitRes")).catch(() => {});

// ==========================================
// 🛠️ 2. CRYPTO ENGINE
// ==========================================
function decryptData(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) { return null; }
}

function logTraffic(method, path, status, startTime, reqData, resData, rawReqHex, rawResHex) {
    requestLogs.unshift({
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData,
        raw_request_hex: rawReqHex,
        raw_response_hex: rawResHex
    });
    // Log limit barha di hai takay ziada data pakra jaye
    if (requestLogs.length > 200) requestLogs.pop();
}

// ==========================================
// 🛡️ 3. LOCAL MOCKS (ver.php)
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
            "billboard_msg": "👑 KING_NEXUS: DEEP LOGGING ACTIVE",
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

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/', (req, res) => res.redirect('/romeo/ds'));

app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Deep Logger</title>
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
            <header class="flex flex-col sm:flex-row justify-between items-center pb-4 mb-6 border-b border-purple-500/20 gap-4">
                <div class="flex items-center gap-4">
                    <div class="p-2 bg-purple-900/30 rounded-full border border-purple-500/50">
                        <svg class="w-5 h-5 text-purple-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase">KING_NEXUS_DEEP_LOGGER</h1>
                        <p class="text-[9px] text-purple-400/70 font-bold uppercase tracking-[0.2em] mt-1">Status: Monitoring All Requests...</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="copyAllLogs(this)" class="px-5 py-2 bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600 hover:text-white transition-all text-[10px] font-black rounded-full tracking-widest aurora-glow">📋 COPY ALL PACKETS</button>
                    <button onclick="clearLogs()" class="px-5 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-full tracking-widest">🗑️ CLEAR</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-4"></div>
        </div>
        <script>
            let localLogs = [];
            async function clearLogs() { await fetch('/api/internal/clear', { method: 'POST' }); localLogs = []; render(); }
            
            function copyAllLogs(btn) {
                if(localLogs.length === 0) return;
                navigator.clipboard.writeText(JSON.stringify(localLogs, null, 2)).then(() => {
                    const orig = btn.innerHTML;
                    btn.innerHTML = '✅ COPIED TO CLIPBOARD!';
                    setTimeout(() => btn.innerHTML = orig, 2000);
                });
            }

            function render() {
                const container = document.getElementById('logs-container');
                let html = '';
                localLogs.forEach(log => {
                    let isError = log.status >= 400;
                    let isSpecial = log.path.includes('MajorLogin') || log.path.includes('Outfit');
                    let borderClass = isError ? 'border-red-500/30' : (isSpecial ? 'border-blue-500/50 aurora-glow' : 'border-white/5');
                    
                    html += \`
                    <div class="bg-black/60 backdrop-blur-md rounded-xl p-4 border \${borderClass} transition-all">
                        <div class="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-purple-300 font-bold text-xs tracking-wide">\${log.path}</span>
                            </div>
                            <span class="\${isError ? 'text-red-400 bg-red-900/30' : 'text-emerald-400 bg-emerald-900/30'} text-[10px] font-black px-2 py-1 rounded">\${log.status} | \${log.duration}</span>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div class="p-2 bg-black/80 rounded border border-white/5 h-32 overflow-y-auto"><pre class="text-blue-400/80">\${log.req}</pre></div>
                            <div class="p-2 bg-black/80 rounded border border-white/5 h-32 overflow-y-auto"><pre class="text-gray-400/80">\${log.res}</pre></div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html || '<div class="text-center text-gray-500 py-10">Waiting for game traffic...</div>';
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

// ==========================================
// 🌌 5. THE DEEP CAPTURE ENGINE
// ==========================================
app.all('*', async (req, res) => {
    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[BINARY]";
    let parsedResLog = "[BINARY]";

    // --- CHECK LOCAL BYPASS ---
    const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));
    if (localRule) {
        const mock = LOCAL_RESPONSES[localRule];
        res.setHeader('Content-Type', mock.type);
        res.status(mock.status).send(mock.data);
        logTraffic(req.method, req.originalUrl, mock.status, startTime, "LOCAL BYPASS", "SUCCESS", "", "");
        return;
    }

    // --- DECODE REQUEST IF KNOWN ---
    if (reqBuffer.length > 0) {
        const dec = decryptData(reqBuffer);
        if (dec && MajorLoginReq && req.path.includes('MajorLogin')) {
            try { parsedReqLog = JSON.stringify(MajorLoginReq.toObject(MajorLoginReq.decode(dec), {defaults:true}), null, 2); } catch(e) {}
        } else {
            parsedReqLog = "Hex: " + reqBuffer.toString('hex').substring(0, 100);
        }
    }

    try {
        let pathUrl = req.originalUrl.replace(/^\//, ''); 
        const targetUrl = `${GARENA_API}/${pathUrl}`;

        const headers = { ...req.headers };
        delete headers.host;
        // 🔥 FORCE NO COMPRESSION takay log parha ja sakay
        delete headers['accept-encoding']; 
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: reqBuffer.length > 0 ? reqBuffer : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());

        // --- DECODE RESPONSE IF KNOWN ---
        if (resBuffer.length > 0) {
            if (req.path.includes('MajorLogin') && MajorLoginRes) {
                try { parsedResLog = JSON.stringify(MajorLoginRes.toObject(MajorLoginRes.decode(resBuffer), {defaults:true}), null, 2); } catch(e) {}
            } else if ((req.path.includes('GetOutfit') || req.path.includes('GetAccountOutfit')) && GetOutfitRes) {
                try { 
                    // Inventory request ko decode karne ki koshish
                    const decRes = decryptData(resBuffer) || resBuffer;
                    parsedResLog = JSON.stringify(GetOutfitRes.toObject(GetOutfitRes.decode(decRes), {defaults:true}), null, 2); 
                } catch(e) { parsedResLog = "Inventory Binary Captured. Size: " + resBuffer.length; }
            } else {
                parsedResLog = "Hex: " + resBuffer.toString('hex').substring(0, 100);
            }
        }

        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        
        res.status(response.status).send(resBuffer);
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReqLog, parsedResLog, reqBuffer.toString('hex'), resBuffer.toString('hex'));

    } catch (e) {
        if (!res.headersSent) res.status(502).send("OFFLINE");
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReqLog, "ERROR: " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
