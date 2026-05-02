const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// ==========================================
// 🚀 THE SMART ROUTING TARGETS
// ==========================================
const GARENA_OFFICIAL = 'https://csoversea.castle.freefiremobile.com'; // Original Server
const ASTUTECH_HACKS = 'https://srv0010.astutech.online';              // Spoof Server

// 🚨 YAHAN WOH PATHS LIKH JIN ME ASTUTECH BUNDLES DETA HAI
const ASTUTECH_ROUTES = [
    "/GetPlayerBundle",  // Ye sirf examples hain, asli paths tujhe dashboard se dhondne hain
    "/SyncInventory",
    "/api/role"
];

let requestLogs = []; 

// ==========================================
// 🛠️ 1. LOCAL ENGINE (Ver.php etc)
// ==========================================
const LOCAL_RESPONSES = {
    "/ver.php": {
        status: 200,
        type: 'application/json',
        // Ye wahi payload hai jo tune bheja tha!
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
            "billboard_msg": "ROMEO NEXUS: SMART SPLIT ROUTER ACTIVE!",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    }
};

// ==========================================
// 2. MASTER DASHBOARD ROUTE (/romeo/ds)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Romeo Smart Router</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #050505; }
            ::-webkit-scrollbar-thumb { background: #10b981; border-radius: 4px; }
            .log-enter { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; }
        </style>
    </head>
    <body class="bg-[#050505] text-gray-300 font-mono p-4">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center border-b border-emerald-900/40 pb-4 mb-6 gap-4">
                <div>
                    <h1 class="text-3xl font-black text-emerald-500 tracking-tighter italic">SMART<span class="text-white">_NEXUS</span></h1>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">3-Way Traffic Splitter Active</p>
                </div>
                <div class="flex gap-3 items-center">
                    <button onclick="clearLogs()" class="px-4 py-2 bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition text-xs font-bold rounded">CLEAR TRAFFIC</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-6"></div>
        </div>
        <script>
            const STORAGE_KEY = 'romeo_smart_logs';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyFullLog(btn, logId) {
                const logData = localLogs.find(l => l.id === logId);
                if(logData) {
                    const exportData = {
                        method: logData.method,
                        path: logData.path,
                        route_type: logData.route_type,
                        request: { parsed: logData.req, full_hex: logData.full_req_hex },
                        response: { parsed: logData.res, full_hex: logData.full_res_hex }
                    };
                    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2)).then(() => {
                        const orig = btn.innerHTML;
                        btn.innerHTML = 'COPIED!';
                        btn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-600');
                        setTimeout(() => {
                            btn.innerHTML = orig;
                            btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-600');
                        }, 1500);
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
                    let borderColor = 'border-gray-800';
                    
                    if(log.route_type === 'LOCAL') {
                        badge = '<span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-black ml-3">LOCAL VERCEL</span>';
                        borderColor = 'border-blue-900/50';
                    } else if(log.route_type === 'ASTUTECH') {
                        badge = '<span class="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-black ml-3 shadow-[0_0_8px_rgba(147,51,234,0.6)] animate-pulse">ASTUTECH (HACK)</span>';
                        borderColor = 'border-purple-900/50';
                    } else {
                        badge = '<span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-black ml-3">GARENA OFFICIAL</span>';
                        borderColor = 'border-emerald-900/50';
                    }

                    html += \`
                    <div class="bg-[#0a0a0a] border \${borderColor} rounded-xl p-4 log-enter shadow-lg">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-900 pb-3 gap-2">
                            <div class="flex items-center gap-3">
                                <span class="text-gray-300 font-black text-lg bg-gray-900 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-gray-200 font-bold">\${log.path}</span>
                                \${badge}
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-gray-500 text-xs font-bold">\${log.duration}</span>
                                <span class="text-emerald-500 text-sm font-black bg-gray-900 px-2 py-1 rounded">\${log.status}</span>
                                <button onclick="copyFullLog(this, '\${log.id}')" class="text-xs font-black text-yellow-500 border border-yellow-500 hover:bg-yellow-500 hover:text-black px-4 py-1.5 rounded transition-colors">COPY FULL DATA</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-3 left-3 bg-gray-900 text-gray-300 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-gray-700">APP REQUEST</div>
                                <pre class="p-3 bg-black/60 border border-gray-900 rounded-lg text-gray-400 mt-1">\${log.req}</pre>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-3 left-3 bg-gray-900 text-gray-300 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-gray-700">SERVER RESPONSE</div>
                                <pre class="p-3 bg-black/60 border border-gray-900 rounded-lg text-gray-400 mt-1">\${log.res}</pre>
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
// 3. SMART ROUTING ENGINE
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
        const isAstutechRoute = ASTUTECH_ROUTES.some(p => req.path.includes(p));

        // 🟢 ROUTE 1: LOCAL VERCEL
        if (localRule) {
            routeType = 'LOCAL';
            const mockData = LOCAL_RESPONSES[localRule];
            status = mockData.status;
            resBuffer = mockData.data;
            res.setHeader('Content-Type', mockData.type);
            res.status(status).send(resBuffer);
            duration = "0ms";
        } 
        // 🟣 ROUTE 2: ASTUTECH (For Inventory Hacks)
        else if (isAstutechRoute) {
            routeType = 'ASTUTECH';
            const targetUrl = `${ASTUTECH_HACKS}${req.originalUrl}`; 
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
        // 🟢 ROUTE 3: GARENA OFFICIAL (Login, Ping, Clean Traffic)
        else {
            routeType = 'GARENA';
            const targetUrl = `${GARENA_OFFICIAL}${req.originalUrl}`; 
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

        // ==========================================
        // 📊 PARSING LOGS
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
