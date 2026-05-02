const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
// 100MB limit zaroori hai takay Free Fire ke heavy binary packets crash na hon
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// ==========================================
// 👑 TARGET SERVERS (The Split-Tunnel)
// ==========================================
// 1. GARENA OFFICIAL (Login, Ping, Security ke liye)
const GARENA_OFFICIAL = 'https://csoversea.castle.freefiremobile.com'; 

// 2. ASTUTECH HACKS (Skins aur Bundles chori karne ke liye)
const ASTUTECH_HACKS = 'https://srv0010.astutech.online';

// Yahan wo paths hain jo hum GARENA ko bhejenge takay game block na ho
const LOGIN_ROUTES = [
    "/Ping", 
    "/MajorLogin", 
    "/Login", 
    "/TokenLogin", 
    "/GuestLogin", 
    "/Report"
];

let requestLogs = []; 

// ==========================================
// 🛠️ LOCAL MOCK ENGINE (Sirf Game Start ke liye)
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
            // VERCEL LINK NICHE DALA HAI
            "server_url": "https://rm-proxy-intercept.vercel.app/", 
            "is_review_server": false,
            "use_login_optional_download": true,
            "use_background_download": true,
            "use_background_download_lobby": true,
            "country_code": "SG",
            "client_ip": "15.235.211.216",
            "gdpr_version": 0,
            "billboard_msg": "👑 KING AURORA NEXUS: SMART SPLIT ROUTER ACTIVE!",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 🌌 DASHBOARD ROUTE (Aurora Glow & Crown Theme)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Aurora Nexus</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            
            .aurora-glow {
                box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.2);
                border: 1px solid rgba(139, 92, 246, 0.5);
            }
            .aurora-text {
                background: linear-gradient(to right, #a855f7, #3b82f6, #2dd4bf);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
            }
            .log-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 10px; line-height: 1.4; }
        </style>
    </head>
    <body class="min-h-screen p-4 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#030008] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center pb-6 mb-8 border-b border-purple-500/20 gap-4 relative">
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 text-4xl opacity-50 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">👑</div>
                
                <div class="text-center sm:text-left z-10 pt-4">
                    <h1 class="text-4xl font-black aurora-text tracking-widest uppercase">KING_NEXUS</h1>
                    <p class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]">Smart Split-Tunnel Router</p>
                </div>
                <div class="flex gap-4 items-center z-10">
                    <button onclick="clearLogs()" class="px-5 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 hover:border-red-400 transition-all text-xs font-black rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.3)]">CLEAR LOGS</button>
                    <div class="px-5 py-2 bg-black text-purple-400 border border-purple-500/50 text-xs font-black rounded-lg flex items-center gap-2 aurora-glow">
                        <div class="w-2 h-2 bg-purple-500 rounded-full animate-ping"></div> AUTO-ROUTING
                    </div>
                </div>
            </header>
            <div id="logs-container" class="space-y-6"></div>
        </div>
        <script>
            const STORAGE_KEY = 'king_nexus_logs';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyFullLog(btn, logId) {
                const logData = localLogs.find(l => l.id === logId);
                if(logData) {
                    const exportData = {
                        method: logData.method, path: logData.path, route_type: logData.route_type, status: logData.status,
                        request: { parsed: logData.req, full_hex: logData.full_req_hex },
                        response: { parsed: logData.res, full_hex: logData.full_res_hex }
                    };
                    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2)).then(() => {
                        const orig = btn.innerHTML;
                        btn.innerHTML = 'COPIED TO CLIPBOARD!';
                        btn.classList.add('bg-purple-600', 'text-white', 'border-purple-400');
                        setTimeout(() => {
                            btn.innerHTML = orig;
                            btn.classList.remove('bg-purple-600', 'text-white', 'border-purple-400');
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
                    let badge = '';
                    let glowClass = '';
                    
                    if(log.route_type === 'LOCAL') {
                        badge = '<span class="bg-blue-900/80 text-blue-300 text-[9px] px-2 py-1 rounded border border-blue-500/50 font-black ml-3 tracking-widest">VERCEL MOCK</span>';
                        glowClass = 'shadow-[0_0_15px_rgba(59,130,246,0.15)] border-blue-900/40';
                    } else if(log.route_type === 'ASTUTECH') {
                        badge = '<span class="bg-purple-900/80 text-purple-300 text-[9px] px-2 py-1 rounded border border-purple-500 font-black ml-3 tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.5)]">ASTUTECH (HACKS)</span>';
                        glowClass = 'aurora-glow';
                    } else {
                        badge = '<span class="bg-emerald-900/80 text-emerald-300 text-[9px] px-2 py-1 rounded border border-emerald-500/50 font-black ml-3 tracking-widest">GARENA (LOGIN)</span>';
                        glowClass = 'shadow-[0_0_15px_rgba(16,185,129,0.1)] border-emerald-900/30';
                    }

                    html += \`
                    <div class="bg-black/40 backdrop-blur-md rounded-xl p-5 log-enter transition-all \${glowClass}">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 border-b border-white/5 pb-4 gap-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-sm bg-white/10 px-3 py-1 rounded-lg">\${log.method}</span>
                                <span class="text-gray-300 font-bold text-sm tracking-wide">\${log.path}</span>
                                \${badge}
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-gray-500 text-xs font-bold">\${log.duration}</span>
                                <span class="text-white text-sm font-black bg-white/10 px-3 py-1 rounded-lg">\${log.status}</span>
                                <button onclick="copyFullLog(this, '\${log.id}')" class="text-[10px] font-black text-purple-400 border border-purple-500/50 hover:bg-purple-900/50 px-4 py-2 rounded-lg transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] tracking-widest">COPY ALL DATA</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div class="relative group">
                                <div class="absolute -top-3 left-4 bg-black text-gray-400 text-[8px] font-black px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest z-10 shadow-[0_0_10px_rgba(0,0,0,1)]">App Request</div>
                                <div class="p-4 bg-black/60 rounded-xl border border-white/5 h-48 overflow-y-auto overflow-x-hidden custom-scroll relative">
                                    <pre class="text-gray-400/80 group-hover:text-gray-300 transition-colors">\${log.req}</pre>
                                </div>
                            </div>
                            <div class="relative group">
                                <div class="absolute -top-3 left-4 bg-black text-gray-400 text-[8px] font-black px-3 py-1 rounded-full border border-gray-700 uppercase tracking-widest z-10 shadow-[0_0_10px_rgba(0,0,0,1)]">Server Response</div>
                                <div class="p-4 bg-black/60 rounded-xl border border-white/5 h-48 overflow-y-auto overflow-x-hidden custom-scroll relative">
                                    <pre class="text-gray-400/80 group-hover:text-gray-300 transition-colors">\${log.res}</pre>
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
// 3. 🧠 SMART SPLIT-ROUTING ENGINE
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let resBuffer;
    let status = 500;
    let duration = "0ms";
    let routeType = 'GARENA'; 
    let reqBuffer = Buffer.alloc(0);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body)) {
        reqBuffer = req.body;
    }

    try {
        const localRule = Object.keys(LOCAL_RESPONSES).find(p => req.path.includes(p));
        const isLoginRoute = LOGIN_ROUTES.some(p => req.path.includes(p));

        const pathUrl = req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // 🟢 ROUTE 1: LOCAL VERCEL MOCK (ver.php)
        if (localRule) {
            routeType = 'LOCAL';
            const mockData = LOCAL_RESPONSES[localRule];
            status = mockData.status;
            resBuffer = mockData.data;
            res.setHeader('Content-Type', mockData.type);
            res.status(status).send(resBuffer);
            duration = "0ms";
        } 
        // 🟢 ROUTE 2: GARENA OFFICIAL (Login, Ping) -> No 500 Error Here!
        else if (isLoginRoute) {
            routeType = 'GARENA';
            const targetUrl = `${GARENA_OFFICIAL}${pathUrl}`; 
            const headers = { ...req.headers };
            delete headers.host; delete headers['accept-encoding']; 
            
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
        // 🟣 ROUTE 3: ASTUTECH HACKS (Inventory, Skins etc.) -> With IP Spoofing
        else {
            routeType = 'ASTUTECH';
            const targetUrl = `${ASTUTECH_HACKS}${pathUrl}`; 
            const headers = { ...req.headers };
            delete headers.host; delete headers['accept-encoding']; 
            
            // 🔥 MAGIC HACK: Astutech ko tera asli mobile IP dikhega, Vercel ka nahi!
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
        // 📊 PARSING LOGS FOR DASHBOARD
        // ==========================================
        let fullReqHex = reqBuffer.toString('hex');
        let parsedReq = "Empty Payload";
        if (reqBuffer.length > 0) {
            const reqStr = reqBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(reqStr)) parsedReq = "[BINARY/HEX]\\n" + fullReqHex.substring(0, 300) + "...";
            else { try { parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); } catch(e) { parsedReq = reqStr; } }
        }

        let fullResHex = resBuffer.toString('hex');
        let parsedRes = "Empty Response";
        if (resBuffer.length > 0) {
            const resStr = resBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(resStr)) parsedRes = "[BINARY/HEX]\\n" + fullResHex.substring(0, 300) + "...";
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
