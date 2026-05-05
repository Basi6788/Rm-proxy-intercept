const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 FALLBACK TARGET (Sirf un paths ke liye jo abhi humne capture nahi kiye)
const FALLBACK_URL = 'https://srv0010.astutech.online'; 
let requestLogs = []; 

// ==========================================
// 🛠️ THE LOCAL MOCK ENGINE (ASTUTECH KICKED OUT!)
// ==========================================
const LOCAL_RESPONSES = {
    // 1. GAME ENTRY CONFIG
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
            "billboard_msg": "👑 KING AURORA NEXUS: ASTUTECH BYPASSED SUCCESSFULLY!",
            "core_url": "https://csoversea.castle.freefiremobile.com/",
            "core_ip_list": ["0.0.0.0", "50.109.27.134", "129.226.2.163", "129.226.1.13", "129.226.1.16"],
            "appstore_url": "http://play.google.com/store/apps/details?id=com.dts.freefiremax",
            "garena_login": false,
            "garena_hint": false
        }))
    },
    
    // 2. PING ROUTE (Tera Capture Kiya Hua Hex)
    "/Ping": {
        status: 401,
        type: 'application/octet-stream',
        data: Buffer.from("556e617574686f72697a6564", "hex") // Hex for "Unauthorized"
    },

    // 🔥 3. MAJOR LOGIN (The Holy Grail) -> AB YAHAN ASTUTECH KA KOI KAAM NAHI!
    "/MajorLogin": {
        status: 200,
        type: 'application/octet-stream',
        // Tera chori kiya hua exact valid JWT token aur payload
        data: Buffer.from("0888959efc371202504b1a0253472202494e2a046c69766542860665794a68624763694f694a49557a49314e694973496e4e3263694936496a45694c434a30655841694f694a4b5631516966512e65794a6859324e766457353058326c6b496a6f784e5441794e4451354d5445304e437769626d6c6a61323568625755694f694a6d65573948524546345a454a73576c4e44526e685849697769626d3930615639795a576470623234694f694a5452794973496d787659327466636d566e61573975496a6f69554573694c434a6c6548526c636d3568624639705a434936496a4d304e57566c4e5441774f44426c596a526d4f4759794e6a4e6b4d5445774e6a6735597a566a4d7a6779496977695a5868305a584a755957786664486c775a5349364e43776963477868644639705a4349364d537769593278705a57353058335a6c636e4e70623234694f6949794c6a45794e4334784d434973496d5674645778686447397958334e6a62334a6c496a6f774c434a706331396c6258567359585276636949365a6d467363325573496d4e7664573530636e6c665932396b5a534936496b6c4f496977695a5868305a584a755957786664576c6b496a6f304e6a49334f544d7a4d5455354c434a795a57646659585a6864474679496a6f784d4449774d4441774d446373496e4e7664584a6a5a5349364d4377696247396a613139795a5764706232356664476c745a5349364d5463334d7a49784f546b324e797769593278705a57353058335235634755694f6a4973496e4e705a323568644856795a5639745a4455694f69497859574d30596a67775a574e6d4d4451334f4745304e4449774d324a6d4f475a68597a59784d6a426d4e534973496e567a6157356e58335a6c636e4e70623234694f6a4173496e4a6c624756686332566659326868626d356c62434936496d46755a484a76615752666257463449697769636d56735a57467a5a5639325a584a7a61573975496a6f69543049314d794973496d5634634349364d5463334f4441784d5467794e48302e414f524c464330392d56684d46776d44526744474550784b315063667741785a5f50456d4c5f78516247594880e101522068747470733a2f2f61757468737276312e616e64726f6964737276732e636f6d7a02080182015d63736f7665727365612e7374726f6e67686f6c642e66726565666972656d6f62696c652e636f6d3b33342e3132362e37362e34353b33342e38372e3137372e31343b33342e38372e3137302e3233303b33352e3138352e3138332e35379a01064d756d626169a201024d48a801b0bce7cf06b2011033655b7a6eff617f501e002802121220ba0110025d28747efc727b7433000011110022", "hex")
    }
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
            const STORAGE_KEY = 'king_nexus_logs_v10';
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
                        ? '<span class="bg-blue-900/80 text-blue-300 text-[9px] px-2 py-0.5 rounded border border-blue-500/50 font-black tracking-widest">LOCAL MOCK (BYPASSED)</span>' 
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

