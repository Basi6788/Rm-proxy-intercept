const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 TEMPORARY TARGET (Sirf data capture karne ke liye takay 500 crash na aye)
const FALLBACK_URL = 'https://srv0010.astutech.online'; 

let requestLogs = []; 
let gameItemsDB = {}; 

function loadLocalItems() {
    try {
        const publicDir = path.join(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
            const files = fs.readdirSync(publicDir);
            files.forEach(file => {
                if (file.endsWith('.json')) {
                    try { gameItemsDB[file] = JSON.parse(fs.readFileSync(path.join(publicDir, file), 'utf8')); } catch (err) {}
                }
            });
        }
    } catch (err) {}
}
loadLocalItems();

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
            "billboard_msg": "👑 KING AURORA NEXUS: CAPTURE MODE ACTIVE!",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 🌌 DASHBOARD ROUTE (King Aurora & JSON Export)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Capture Nexus</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            
            .aurora-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); }
            .aurora-text { background: linear-gradient(to right, #a855f7, #3b82f6, #2dd4bf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 20px rgba(168, 85, 247, 0.5); }
            .log-enter { animation: slideUp 0.3s ease-out forwards; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; line-height: 1.5; }
        </style>
    </head>
    <body class="min-h-screen p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#030008] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center pb-4 mb-6 border-b border-purple-500/20 gap-4 relative">
                <div class="text-center sm:text-left z-10 pt-2">
                    <h1 class="text-3xl font-black aurora-text tracking-widest uppercase">KING_NEXUS</h1>
                    <p class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">Data Capture Mode Active</p>
                </div>
                <div class="flex gap-3 items-center z-10">
                    <button onclick="clearLogs()" class="px-4 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.3)] tracking-widest">CLEAR LOGS</button>
                    <div class="px-4 py-2 bg-black text-purple-400 border border-purple-500/50 text-[10px] font-black rounded-lg flex items-center gap-2 aurora-glow tracking-widest">
                        <div class="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div> LISTENING
                    </div>
                </div>
            </header>
            <div id="logs-container" class="space-y-5"></div>
        </div>
        <script>
            const STORAGE_KEY = 'king_nexus_logs_v9';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyFullJSON(btn, logId) {
                const logData = localLogs.find(l => l.id === logId);
                if(logData) {
                    const exportData = {
                        method: logData.method,
                        path: logData.path,
                        route_type: logData.route_type,
                        status: logData.status,
                        request: {
                            parsed: logData.req,
                            full_hex: logData.full_req_hex
                        },
                        response: {
                            parsed: logData.res,
                            full_hex: logData.full_res_hex
                        }
                    };
                    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2)).then(() => {
                        const orig = btn.innerHTML;
                        btn.innerHTML = '✅ COPIED!';
                        btn.classList.replace('text-yellow-400', 'text-white');
                        btn.classList.replace('border-yellow-500/50', 'border-green-500/50');
                        btn.classList.add('bg-green-600');
                        setTimeout(() => {
                            btn.innerHTML = orig;
                            btn.classList.replace('text-white', 'text-yellow-400');
                            btn.classList.replace('border-green-500/50', 'border-yellow-500/50');
                            btn.classList.remove('bg-green-600');
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
                    let badge = log.route_type === 'LOCAL' 
                        ? '<span class="bg-blue-900/80 text-blue-300 text-[9px] px-2 py-0.5 rounded border border-blue-500/50 font-black tracking-widest">LOCAL MOCK</span>' 
                        : '<span class="bg-purple-900/80 text-purple-300 text-[9px] px-2 py-0.5 rounded border border-purple-500/50 font-black tracking-widest">LIVE FETCH</span>';

                    html += \`
                    <div class="bg-black/40 backdrop-blur-md rounded-xl p-4 log-enter border border-white/5 hover:border-purple-500/30 transition-all">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-white/5 pb-3 gap-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-gray-300 font-bold text-xs tracking-wide">\${log.path}</span>
                                \${badge}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="text-gray-500 text-[10px] font-bold">\${log.duration}</span>
                                <span class="text-white text-xs font-black bg-white/10 px-2 py-1 rounded">\${log.status}</span>
                                <button onclick="copyFullJSON(this, '\${log.id}')" class="text-[10px] font-black text-yellow-400 border border-yellow-500/50 hover:bg-yellow-900/50 px-3 py-1.5 rounded-lg transition-all shadow-[0_0_10px_rgba(234,179,8,0.15)] tracking-widest flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    COPY ALL JSON
                                </button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#111] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700 uppercase tracking-widest z-10">APP REQUEST</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-40 overflow-y-auto overflow-x-hidden custom-scroll relative">
                                    <pre class="text-gray-400/80">\${log.req}</pre>
                                </div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#111] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded border border-gray-700 uppercase tracking-widest z-10">SERVER RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-40 overflow-y-auto overflow-x-hidden custom-scroll relative">
                                    <pre class="text-gray-400/80">\${log.res}</pre>
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
// 3. PROXY ENGINE
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let resBuffer;
    let status = 500;
    let duration = "0ms";
    let routeType = 'LIVE'; 
    let reqBuffer = Buffer.alloc(0);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body)) {
        reqBuffer = req.body;
    }

    try {
        const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.path.includes(p));
        const pathUrl = req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

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
            const targetUrl = `${FALLBACK_URL}${pathUrl}`; 
            const headers = { ...req.headers };
            delete headers.host; 
            delete headers['accept-encoding']; 
            headers['x-forwarded-for'] = clientIp;

            const options = { method: req.method, headers };
            if (reqBuffer.length > 0) options.body = reqBuffer;

            const response = await fetch(targetUrl, options);
            resBuffer = Buffer.from(await response.arrayBuffer());
            status = response.status;
            duration = `${Date.now() - startTime}ms`;

            response.headers.forEach((v, n) => {
                if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) res.setHeader(n, v);
            });
            res.status(status).send(resBuffer);
        }

        // ==========================================
        // 📊 PARSING LOGS FOR JSON EXPORT
        // ==========================================
        let fullReqHex = reqBuffer.toString('hex');
        let parsedReq = "Empty Payload";
        if (reqBuffer.length > 0) {
            const reqStr = reqBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(reqStr)) parsedReq = "[BINARY/HEX PREVIEW]\\n" + fullReqHex.substring(0, 300) + "...";
            else { try { parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); } catch(e) { parsedReq = reqStr; } }
        }

        let fullResHex = resBuffer.toString('hex');
        let parsedRes = "Empty Response";
        if (resBuffer.length > 0) {
            const resStr = resBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(resStr)) parsedRes = "[BINARY/HEX PREVIEW]\\n" + fullResHex.substring(0, 300) + "...";
            else { try { parsedRes = JSON.stringify(JSON.parse(resStr), null, 2); } catch(e) { parsedRes = resStr; } }
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
