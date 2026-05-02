const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 FALLBACK TARGET
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
                    try {
                        gameItemsDB[file] = JSON.parse(fs.readFileSync(path.join(publicDir, file), 'utf8'));
                    } catch (err) {}
                }
            });
        }
    } catch (err) {}
}
loadLocalItems();

// ==========================================
// 🛠️ THE PRIVATE EMULATOR ENGINE
// ==========================================
const CUSTOM_RESPONSES = {
    // 1. VERSION CONFIG (Yahan tera vercel URL auto lagta hai)
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
            "billboard_msg": "ROMEO NEXUS: HYBRID PRIVATE SERVER ACTIVE!",
            "core_url": "csoversea.castle.freefiremobile.com",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    },
    // NOTE: /MajorLogin hata diya hai takay DataType error na aye aur game chalti rahe.
};

// ==========================================
// 1. DASHBOARD ROUTE (/romeo/ds)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Romeo Hybrid Master</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #050505; }
            ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
            .log-enter { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; }
        </style>
    </head>
    <body class="bg-[#050505] text-gray-300 font-mono p-4">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center border-b border-blue-900/40 pb-4 mb-6 gap-4">
                <div>
                    <h1 class="text-3xl font-black text-blue-500 tracking-tighter italic">MASTER<span class="text-white">_NEXUS</span></h1>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Target: Hybrid Auto-Router</p>
                </div>
                <div class="flex gap-3 items-center">
                    <button onclick="clearLogs()" class="px-4 py-2 bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition text-xs font-bold rounded">CLEAR TRAFFIC</button>
                    <div class="px-4 py-2 bg-blue-900/20 text-blue-400 border border-blue-500/50 text-xs font-bold rounded flex items-center gap-2">
                        <div class="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div> ENGINE RUNNING
                    </div>
                </div>
            </header>
            <div id="logs-container" class="space-y-6"></div>
        </div>
        <script>
            const STORAGE_KEY = 'romeo_emu_logs_v2';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            // NAYA MASTER COPY BUTTON JO POORA DATA COPY KAREGA
            function copyFullLog(btn, logId) {
                const logData = localLogs.find(l => l.id === logId);
                if(logData) {
                    const exportData = {
                        method: logData.method,
                        path: logData.path,
                        status: logData.status,
                        is_local_mock: logData.is_local,
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
                        const originalHTML = btn.innerHTML;
                        btn.innerHTML = 'COPIED ALL DATA!';
                        btn.classList.replace('text-yellow-500', 'text-white');
                        btn.classList.replace('border-yellow-500', 'border-white');
                        btn.classList.add('bg-yellow-600');
                        setTimeout(() => {
                            btn.innerHTML = originalHTML;
                            btn.classList.replace('text-white', 'text-yellow-500');
                            btn.classList.replace('border-white', 'border-yellow-500');
                            btn.classList.remove('bg-yellow-600');
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
                    const badge = log.is_local 
                        ? '<span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-black border border-blue-400 animate-pulse ml-3">LOCAL MOCK</span>' 
                        : '<span class="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded font-black border border-purple-400 ml-3">LIVE FETCH</span>';
                    
                    html += \`
                    <div class="bg-[#0a0a0a] border \${log.is_local ? 'border-blue-900/50' : 'border-gray-800'} rounded-xl p-4 log-enter hover:border-gray-600 transition-colors shadow-lg">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-900 pb-3 gap-2">
                            <div class="flex items-center gap-3">
                                <span class="text-blue-400 font-black text-lg bg-gray-900 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-gray-200 font-bold">\${log.path}</span>
                                \${badge}
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-gray-500 text-xs font-bold">\${log.duration}</span>
                                <span class="\${log.is_local ? 'text-blue-500' : 'text-green-500'} text-sm font-black bg-gray-900 px-2 py-1 rounded">\${log.status}</span>
                                <button onclick="copyFullLog(this, '\${log.id}')" class="text-xs font-black text-yellow-500 border border-yellow-500 hover:bg-yellow-500 hover:text-black px-4 py-1.5 rounded transition-colors shadow-[0_0_10px_rgba(234,179,8,0.2)]">COPY FULL DATA (JSON + HEX)</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-3 left-3 bg-gray-900 text-gray-300 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-gray-700">APP REQUEST</div>
                                <pre class="p-3 bg-black/60 border border-gray-900 rounded-lg text-gray-400 mt-1">\${log.req}</pre>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-3 left-3 \${log.is_local ? 'bg-blue-900 text-blue-300 border-blue-700' : 'bg-green-900 text-green-300 border-green-700'} text-[9px] font-black px-2 py-0.5 rounded uppercase border">SERVER RESPONSE</div>
                                <pre class="p-3 bg-black/60 border \${log.is_local ? 'border-blue-900/30' : 'border-gray-900'} rounded-lg text-gray-400 mt-1">\${log.res}</pre>
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
// 2. PROXY & HYBRID INJECTION LOGIC
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let resBuffer;
    let status = 500;
    let duration = "0ms";
    let isLocal = false;
    let reqBuffer = Buffer.alloc(0);

    // Grab raw request body
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body)) {
        reqBuffer = req.body;
    }

    try {
        const rulePath = Object.keys(CUSTOM_RESPONSES).find(p => req.path.includes(p));

        // 🟢 LOCAL MOCK
        if (rulePath) {
            const mockData = CUSTOM_RESPONSES[rulePath];
            status = mockData.status;
            resBuffer = mockData.data;
            
            res.setHeader('Content-Type', mockData.type);
            res.status(status).send(resBuffer);
            
            duration = "0ms (LOCAL CACHE)";
            isLocal = true;
        } 
        // 🟡 FALLBACK FETCH (Is se login crash nahi hoga!)
        else {
            const pathUrl = req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl;
            const targetUrl = `${FALLBACK_URL}${pathUrl}`; 
            
            const headers = { ...req.headers };
            delete headers.host; 
            delete headers['accept-encoding']; 

            const options = { method: req.method, headers };
            if (reqBuffer.length > 0) options.body = reqBuffer;

            const response = await fetch(targetUrl, options);
            resBuffer = Buffer.from(await response.arrayBuffer());
            status = response.status;
            duration = `${Date.now() - startTime}ms`;

            response.headers.forEach((v, n) => {
                if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) { 
                    res.setHeader(n, v);
                }
            });
            res.status(status).send(resBuffer);
        }

        // ==========================================
        // 📊 PARSING FOR MASTER DASHBOARD
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
            is_local: isLocal,
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
