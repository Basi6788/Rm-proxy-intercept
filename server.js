const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 DIRECT GARENA OFFICIAL URL
const GARENA_OFFICIAL_URL = 'https://csoversea.castle.freefiremobile.com/'; 

let requestLogs = []; 

// ==========================================
// 🧠 PROTOBUF DECODER SETUP
// ==========================================
let MajorLoginDecoder = null;
protobuf.load("MajorLogin.proto", (err, root) => {
    if (err) {
        console.error("❌ Protobuf load error.");
    } else {
        MajorLoginDecoder = root.lookupType("MajorLogin");
        console.log("✅ Protobuf Decoder Loaded!");
    }
});

// ==========================================
// 🛠️ THE LOCAL MOCK ENGINE 
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
            "billboard_msg": "👑 KING AURORA: DYNAMIC LOGIN ACTIVE",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    },
    
    "/Ping": {
        status: 401,
        type: 'application/octet-stream',
        data: Buffer.from("556e617574686f72697a6564", "hex") 
    }
    // 🔥 NOTE: /MajorLogin yahan se HATA DIYA HAI! Ab har kisi ki apni id khulegi!
};

// ==========================================
// 🌌 DASHBOARD ROUTE
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 Independent Emulator</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .log-enter { animation: slideUp 0.3s ease-out forwards; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; line-height: 1.5; }
        </style>
    </head>
    <body class="min-h-screen p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#030008] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center pb-4 mb-6 border-b border-purple-500/20 gap-4 relative">
                <div class="text-center sm:text-left z-10 pt-2">
                    <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase">KING_NEXUS</h1>
                    <p class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1">Dynamic Login Active</p>
                </div>
                <div class="flex gap-3 items-center z-10">
                    <button onclick="clearLogs()" class="px-4 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-lg tracking-widest">CLEAR LOGS</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-5"></div>
        </div>
        <script>
            const STORAGE_KEY = 'king_nexus_independent_v2';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyFullJSON(btn, logId) {
                const logData = localLogs.find(l => l.id === logId);
                if(logData) {
                    const exportData = {
                        method: logData.method, path: logData.path, route_type: logData.route_type, status: logData.status,
                        request: { parsed: logData.req, full_hex: logData.full_req_hex },
                        response: { parsed: logData.res, full_hex: logData.full_res_hex }
                    };
                    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2)).then(() => {
                        const orig = btn.innerHTML;
                        btn.innerHTML = '✅ COPIED!';
                        btn.classList.add('bg-green-600', 'text-white');
                        setTimeout(() => {
                            btn.innerHTML = orig;
                            btn.classList.remove('bg-green-600', 'text-white');
                        }, 2000);
                    });
                }
            }

            async function clearLogs() {
                localStorage.removeItem(STORAGE_KEY);
                localLogs = [];
                document.getElementById('logs-container').innerHTML = '';
                await fetch('/api/internal/clear', { method: 'POST' });
            }

            function render() {
                const container = document.getElementById('logs-container');
                let html = '';
                localLogs.forEach(log => {
                    let isError = log.status >= 400;
                    let badge = log.route_type === 'LOCAL' 
                        ? '<span class="bg-blue-900/80 text-blue-300 text-[9px] px-2 py-0.5 rounded border border-blue-500/50 font-black tracking-widest">LOCAL MOCK</span>' 
                        : (isError 
                            ? '<span class="bg-red-900/80 text-red-300 text-[9px] px-2 py-0.5 rounded border border-red-500/50 font-black tracking-widest animate-pulse">LIVE (ERROR)</span>'
                            : '<span class="bg-purple-900/80 text-purple-300 text-[9px] px-2 py-0.5 rounded border border-purple-500/50 font-black tracking-widest">LIVE FETCH</span>');

                    html += \`
                    <div class="bg-black/40 backdrop-blur-md rounded-xl p-4 log-enter border \${isError ? 'border-red-500/30' : 'border-white/5'}">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-white/5 pb-3 gap-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-gray-300 font-bold text-xs tracking-wide">\${log.path}</span>
                                \${badge}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-gray-500 text-[10px] font-bold">\${log.duration}</span>
                                <span class="\${isError ? 'text-red-400 bg-red-900/30' : 'text-white bg-white/10'} text-xs font-black px-2 py-1 rounded">\${log.status}</span>
                                <button onclick="copyFullJSON(this, '\${log.id}')" class="text-[10px] font-black text-yellow-400 border border-yellow-500/50 px-3 py-1.5 rounded-lg">COPY ALL JSON</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#111] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700">APP REQUEST DECODED</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-40 overflow-y-auto custom-scroll relative">
                                    <pre class="text-green-400/90">\${log.req}</pre>
                                </div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#111] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700">SERVER RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-40 overflow-y-auto custom-scroll relative">
                                    <pre class="\${isError ? 'text-red-400/80' : 'text-gray-400/80'}">\${log.res}</pre>
                                </div>
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
                    let updated = false;
                    serverLogs.reverse().forEach(s => {
                        if (!localLogs.find(l => l.id === s.id)) {
                            localLogs.unshift(s);
                            updated = true;
                        }
                    });
                    if (updated) {
                        if(localLogs.length > 50) localLogs = localLogs.slice(0, 50);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(localLogs));
                        render();
                    }
                } catch(e) {}
            }
            render();
            setInterval(sync, 500);
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 3. THE INDEPENDENT ENGINE
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let resBuffer = Buffer.alloc(0);
    let status = 500;
    let duration = "0ms";
    let routeType = 'LIVE'; 
    let reqBuffer = Buffer.alloc(0);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body)) {
        reqBuffer = req.body;
    }

    let pathUrl = req.originalUrl;
    if (pathUrl.startsWith('/')) pathUrl = pathUrl.substring(1); 

    try {
        const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.originalUrl.includes(p));

        let parsedReq = "Empty Payload";
        if (reqBuffer.length > 0) {
            if (req.path.includes('/MajorLogin') && MajorLoginDecoder) {
                try {
                    const decodedMessage = MajorLoginDecoder.decode(reqBuffer);
                    const jsonObject = MajorLoginDecoder.toObject(decodedMessage, { defaults: true, bytes: String });
                    parsedReq = JSON.stringify(jsonObject, null, 2);
                } catch (decodeErr) {
                    parsedReq = `[PROTOBUF DECODE FAILED]\n${reqBuffer.toString('hex').substring(0, 300)}...`;
                }
            } else {
                const reqStr = reqBuffer.toString('utf8');
                if (/[\x00-\x08\x0E-\x1F]/.test(reqStr)) {
                    parsedReq = "[BINARY/HEX PREVIEW]\\n" + reqBuffer.toString('hex').substring(0, 300) + "...";
                } else { 
                    try { parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); } catch(e) { parsedReq = reqStr; } 
                }
            }
        }

        if (localRule) {
            routeType = 'LOCAL';
            const mockData = LOCAL_RESPONSES[localRule];
            status = mockData.status;
            resBuffer = mockData.data;
            res.setHeader('Content-Type', mockData.type);
            res.status(status).send(resBuffer);
            duration = "0ms";
        } else {
            routeType = 'LIVE';
            const targetUrl = `${GARENA_OFFICIAL_URL}${pathUrl}`; 
            
            const headers = { ...req.headers };
            delete headers.host; 
            delete headers['accept-encoding']; 
            
            const options = { method: req.method, headers };
            if (reqBuffer.length > 0) options.body = reqBuffer;

            try {
                const response = await fetch(targetUrl, options);
                resBuffer = Buffer.from(await response.arrayBuffer());
                status = response.status;
                
                response.headers.forEach((v, n) => {
                    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                        res.setHeader(n, v);
                    }
                });
                res.status(status).send(resBuffer);
            } catch (fetchErr) {
                status = 502;
                resBuffer = Buffer.from("Bad Gateway: Garena connection dropped.");
                res.status(status).send(resBuffer);
            }
            duration = `${Date.now() - startTime}ms`;
        }

        let fullReqHex = reqBuffer.toString('hex');
        let fullResHex = resBuffer.toString('hex');
        let parsedRes = "Empty Response";
        
        if (resBuffer.length > 0) {
            const resStr = resBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(resStr)) {
                parsedRes = "[BINARY/HEX PREVIEW]\\n" + fullResHex.substring(0, 300) + "...";
            } else { 
                try { parsedRes = JSON.stringify(JSON.parse(resStr), null, 2); } catch(e) { parsedRes = resStr; } 
            }
        }

        requestLogs.unshift({
            id: Date.now() + '-' + Math.floor(Math.random() * 1000),
            method: req.method,
            path: req.originalUrl,
            duration,
            status,
            route_type: routeType,
            req: parsedReq,
            res: parsedRes,
            full_req_hex: fullReqHex, 
            full_res_hex: fullResHex  
        });

        if (requestLogs.length > 50) requestLogs.pop();

    } catch (e) {
        if (!res.headersSent) res.status(500).send(e.message);
    }
});

module.exports = app;
