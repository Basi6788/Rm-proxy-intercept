const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());

// 🔥 RAW BODY CAPTURE FOR SNIFFING & INJECTING
app.use(express.raw({ type: '*/*', limit: '500mb' }));

// 🌐 GARENA MASTER SERVERS & YOUR URL
const MY_PROXY_URL = 'https://rm-proxy-intercept.vercel.app';
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
// 🛠️ 2. SMART CRYPTO ENGINE
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
        return Buffer.concat([prefix, enc]);
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

// ===================================================
// 🆕 JWT GENERATOR API
// ===================================================
app.use(express.json());

app.post('/api/generate-jwt', async (req, res) => {
    try {
        let { guest_account_info } = req.body;
        
        // Auto-clean spaces from password
        if (guest_account_info && guest_account_info['com.garena.msdk.guest_password']) {
            guest_account_info['com.garena.msdk.guest_password'] = 
                guest_account_info['com.garena.msdk.guest_password'].replace(/\s/g, '');
        }
        
        if (!guest_account_info || !guest_account_info['com.garena.msdk.guest_uid'] || !guest_account_info['com.garena.msdk.guest_password']) {
            return res.status(400).json({ error: 'Invalid format! Use: {"guest_account_info":{"com.garena.msdk.guest_password":"...","com.garena.msdk.guest_uid":"..."}}' });
        }
        
        const uid = guest_account_info['com.garena.msdk.guest_uid'];
        const password = guest_account_info['com.garena.msdk.guest_password'];
        
        console.log(`[JWT Tool] Generating token for UID: ${uid}`);
        
        const loginReq = {
            uid: uid,
            password: password,
            platform: 1,
            version: "OB53"
        };
        
        const encodedReq = await encodeWithPythonRaw('LoginReq', loginReq);
        if (!encodedReq) throw new Error('Failed to encode LoginReq');
        
        const encrypted = encryptData(encodedReq, Buffer.alloc(0));
        
        const targetUrl = `https://${SERVERS.LOGIN}/MajorLogin`;
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream', 'Host': SERVERS.LOGIN },
            body: encrypted
        });
        
        const encryptedRes = Buffer.from(await response.arrayBuffer());
        const { dec: decryptedRes } = smartDecrypt(encryptedRes);
        
        if (!decryptedRes) throw new Error('Decryption failed');
        
        const jsonRes = await decodeWithPythonRaw('LoginRes', decryptedRes);
        
        if (jsonRes && jsonRes.token) {
            return res.json({ 
                success: true, 
                token: jsonRes.token,
                uid: uid,
                server_url: jsonRes.server_url,
                lock_region: jsonRes.lock_region
            });
        } else {
            return res.status(500).json({ error: 'Token not found in response', response: jsonRes });
        }
        
    } catch (error) {
        console.error('[JWT Tool Error]', error);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 🚀 API & DASHBOARD ROUTES
// ==========================================
app.get('/api/internal/logs/sync', (req, res) => {
    const logsToSend = [...requestLogsBuffer];
    requestLogsBuffer = [];
    res.json(logsToSend);
});

app.post('/api/internal/clear', (req, res) => {
    requestLogsBuffer = [];
    res.json({ success: true });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// 🎨 REDESIGNED DASHBOARD
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>👑 KING NEXUS V9 | Ultimate Hijacker</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            body { 
                background: linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%);
                min-height: 100vh;
            }
            .glow-text {
                text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
            }
            .card-glow {
                background: rgba(15, 15, 26, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(139, 92, 246, 0.15);
                transition: all 0.3s ease;
            }
            .card-glow:hover {
                border-color: rgba(139, 92, 246, 0.4);
                box-shadow: 0 0 25px rgba(139, 92, 246, 0.1);
            }
            .input-dark {
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(139, 92, 246, 0.2);
                transition: all 0.2s ease;
                color: #e2e8f0;
            }
            .input-dark:focus {
                border-color: #8b5cf6;
                outline: none;
                box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
            }
            .btn-primary {
                background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                transition: all 0.2s ease;
            }
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.4);
            }
            .tab-active {
                background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%);
                border-bottom: 2px solid #8b5cf6;
                color: #8b5cf6;
            }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #0a0a0f; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .code-block {
                background: #0a0a0f;
                border: 1px solid #1a1a2e;
                border-radius: 12px;
                padding: 16px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                overflow-x: auto;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            .pulse-dot {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="card-glow rounded-2xl p-6 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-crown text-white text-2xl"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl md:text-4xl font-black glow-text" style="background: linear-gradient(135deg, #a855f7, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                KING NEXUS V9
                            </h1>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="w-2 h-2 rounded-full bg-green-500 pulse-dot"></div>
                                <p class="text-xs text-gray-400 font-semibold uppercase tracking-wider">💉 ACTIVE INJECTION MODE</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs"></i>
                            <input type="text" id="searchBox" oninput="fullRender()" placeholder="Search logs..." class="input-dark pl-8 pr-3 py-2 rounded-lg text-sm w-48 md:w-64">
                        </div>
                        <button onclick="nukeEverything()" class="bg-red-950/50 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-all text-sm font-semibold border border-red-500/30">
                            <i class="fas fa-trash-alt mr-2"></i>CLEAR
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="flex gap-1 mb-6 bg-black/30 rounded-xl p-1">
                <button onclick="showTab('logs')" id="tab-logs-btn" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 tab-active">
                    <i class="fas fa-tachometer-alt"></i> LIVE LOGS
                </button>
                <button onclick="showTab('jwt')" id="tab-jwt-btn" class="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-purple-400">
                    <i class="fas fa-key"></i> JWT GENERATOR
                </button>
            </div>
            
            <!-- Logs Container -->
            <div id="logs-container" class="space-y-4"></div>
            
            <!-- JWT Tool Container -->
            <div id="jwt-container" class="hidden">
                <div class="card-glow rounded-2xl p-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <i class="fas fa-key text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">JWT Token Generator</h2>
                            <p class="text-xs text-gray-400">Generate JWT token from guest account credentials</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-gray-400 mb-2">
                                <i class="fas fa-code mr-1"></i> Paste Guest Account JSON
                            </label>
                            <textarea id="jsonInput" rows="8" class="w-full input-dark rounded-xl p-4 text-sm font-mono" placeholder='{
  "guest_account_info": {
    "com.garena.msdk.guest_password": "344D0EC1ACC234C7D283B0A11954147F18A4AD38F3F3F8C4B7E53AB43D19FD2A",
    "com.garena.msdk.guest_uid": "4627647913"
  }
}'></textarea>
                            <p class="text-xs text-gray-500 mt-2">
                                <i class="fas fa-info-circle"></i> Spaces and line breaks are automatically handled
                            </p>
                        </div>
                        
                        <div class="flex gap-3">
                            <button onclick="generateJWT()" class="btn-primary px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
                                <i class="fas fa-magic"></i> Generate Token
                            </button>
                            <button onclick="clearJWT()" class="bg-gray-800 hover:bg-gray-700 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-eraser"></i> Clear
                            </button>
                            <button onclick="loadExample()" class="border border-purple-500/30 hover:bg-purple-500/10 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-file-alt"></i> Example
                            </button>
                        </div>
                        
                        <div id="jwtResult" class="hidden mt-6">
                            <div class="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-5 border border-purple-500/30">
                                <div class="flex items-center justify-between mb-3">
                                    <p class="text-green-400 text-sm font-bold flex items-center gap-2">
                                        <i class="fas fa-check-circle"></i> TOKEN GENERATED SUCCESSFULLY
                                    </p>
                                    <button onclick="copyToken()" class="text-gray-400 hover:text-white text-sm transition-all">
                                        <i class="fas fa-copy"></i> Copy
                                    </button>
                                </div>
                                <div class="code-block">
                                    <code id="tokenOutput" class="text-purple-300 break-all text-xs"></code>
                                </div>
                                <div class="grid grid-cols-2 gap-3 mt-4 text-xs">
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-gray-500">UID:</span>
                                        <span id="resultUid" class="text-purple-300 ml-2 font-mono"></span>
                                    </div>
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-gray-500">Region:</span>
                                        <span id="resultRegion" class="text-purple-300 ml-2 font-mono"></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div id="jwtError" class="hidden bg-red-950/30 border border-red-500/30 rounded-xl p-4">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-exclamation-triangle text-red-400"></i>
                                <p class="text-red-400 text-sm font-semibold">Error</p>
                            </div>
                            <p id="errorMsg" class="text-red-300 text-xs mt-2"></p>
                        </div>
                    </div>
                </div>
            </div>
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
                let statusIcon = isError ? 'fa-times-circle' : 'fa-check-circle';
                return \`
                <div class="card-glow rounded-xl p-4 transition-all">
                    <div class="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-gray-800 gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs font-bold">\${log.method}</span>
                            <span class="text-blue-300 text-xs font-mono">[\${log.targetHost}] \${log.path}</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-gray-500 text-xs">\${log.timestamp} | \${log.duration}</span>
                            <span class="\${statusColor} px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                <i class="fas \${statusIcon}"></i> \${log.status}
                            </span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <div class="text-gray-500 text-xs mb-2 font-semibold flex items-center gap-1">
                                <i class="fas fa-arrow-up"></i> REQUEST
                            </div>
                            <pre class="bg-black/50 rounded-lg p-3 text-xs text-purple-300/80 overflow-x-auto max-h-48">\${log.req || '[EMPTY]'}</pre>
                        </div>
                        <div>
                            <div class="text-gray-500 text-xs mb-2 font-semibold flex items-center gap-1">
                                <i class="fas fa-arrow-down"></i> RESPONSE
                            </div>
                            <pre class="bg-black/50 rounded-lg p-3 text-xs \${isError ? 'text-red-300/80' : 'text-emerald-300/80'} overflow-x-auto max-h-48">\${log.res || '[EMPTY]'}</pre>
                        </div>
                    </div>
                </div>\`;
            }

            function appendNewLogs(newLogs) {
                document.getElementById('logs-container').insertAdjacentHTML('afterbegin', newLogs.map(generateLogHTML).join(''));
            }
            
            async function fullRender() {
                const term = document.getElementById('searchBox').value.toLowerCase();
                let logs = await db.logs.orderBy('id').reverse().toArray();
                if(term) logs = logs.filter(l => l.path.toLowerCase().includes(term) || String(l.status).includes(term) || l.targetHost.toLowerCase().includes(term));
                document.getElementById('logs-container').innerHTML = logs.length ? logs.map(generateLogHTML).join('') : '<div class="text-center text-gray-500 py-12"><i class="fas fa-inbox text-4xl mb-2"></i><p>No logs found</p></div>';
            }
            
            async function nukeEverything() {
                await fetch('/api/internal/clear', { method: 'POST' });
                await db.logs.clear();
                fullRender();
            }
            
            function showTab(tab) {
                const logsContainer = document.getElementById('logs-container');
                const jwtContainer = document.getElementById('jwt-container');
                const logsBtn = document.getElementById('tab-logs-btn');
                const jwtBtn = document.getElementById('tab-jwt-btn');
                
                if(tab === 'logs') {
                    logsContainer.classList.remove('hidden');
                    jwtContainer.classList.add('hidden');
                    logsBtn.classList.add('tab-active');
                    logsBtn.classList.remove('text-gray-400');
                    jwtBtn.classList.remove('tab-active');
                    jwtBtn.classList.add('text-gray-400');
                    fullRender();
                } else {
                    logsContainer.classList.add('hidden');
                    jwtContainer.classList.remove('hidden');
                    jwtBtn.classList.add('tab-active');
                    jwtBtn.classList.remove('text-gray-400');
                    logsBtn.classList.remove('tab-active');
                    logsBtn.classList.add('text-gray-400');
                }
            }
            
            function loadExample() {
                document.getElementById('jsonInput').value = JSON.stringify({
                    guest_account_info: {
                        "com.garena.msdk.guest_password": "344D0EC1ACC234C7D283B0A11954147F18A4AD38F3F3F8C4B7E53AB43D19FD2A",
                        "com.garena.msdk.guest_uid": "4627647913"
                    }
                }, null, 2);
            }
            
            async function generateJWT() {
                let rawJson = document.getElementById('jsonInput').value.trim();
                if(!rawJson) {
                    showError("Please paste your guest account JSON first!");
                    return;
                }
                
                try {
                    let parsed = JSON.parse(rawJson);
                    
                    // Auto-clean spaces from password
                    if (parsed.guest_account_info && parsed.guest_account_info['com.garena.msdk.guest_password']) {
                        parsed.guest_account_info['com.garena.msdk.guest_password'] = 
                            parsed.guest_account_info['com.garena.msdk.guest_password'].replace(/\\s/g, '');
                    }
                    
                    if(!parsed.guest_account_info || !parsed.guest_account_info['com.garena.msdk.guest_uid'] || !parsed.guest_account_info['com.garena.msdk.guest_password']) {
                        showError("Invalid format! Required: guest_account_info with com.garena.msdk.guest_uid and com.garena.msdk.guest_password");
                        return;
                    }
                    
                    if(parsed.guest_account_info['com.garena.msdk.guest_password'].length < 50) {
                        showError("Password seems too short or invalid format!");
                        return;
                    }
                    
                    document.getElementById('jwtResult').classList.add('hidden');
                    document.getElementById('jwtError').classList.add('hidden');
                    
                    const response = await fetch('/api/generate-jwt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(parsed)
                    });
                    
                    const data = await response.json();
                    
                    if(data.success) {
                        document.getElementById('tokenOutput').innerText = data.token;
                        document.getElementById('resultUid').innerText = data.uid;
                        document.getElementById('resultRegion').innerText = data.lock_region || 'N/A';
                        document.getElementById('jwtResult').classList.remove('hidden');
                    } else {
                        showError(data.error || "Something went wrong!");
                    }
                } catch(e) {
                    showError("Invalid JSON format: " + e.message);
                }
            }
            
            function showError(msg) {
                document.getElementById('errorMsg').innerText = msg;
                document.getElementById('jwtError').classList.remove('hidden');
                document.getElementById('jwtResult').classList.add('hidden');
            }
            
            function clearJWT() {
                document.getElementById('jsonInput').value = '';
                document.getElementById('jwtResult').classList.add('hidden');
                document.getElementById('jwtError').classList.add('hidden');
            }
            
            function copyToken() {
                const token = document.getElementById('tokenOutput').innerText;
                navigator.clipboard.writeText(token);
                const btn = event.target;
                const originalHtml = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
            }
            
            setInterval(syncServerData, 1000);
            fullRender();
            showTab('logs');
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🌌 CATCH-ALL HYBRID INTERCEPTOR
// ==========================================
app.all('*', async (req, res) => {
    if (req.path === '/' || req.path === '/romeo/ds') return;
    if (req.path === '/api/generate-jwt') return;

    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

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
        let modifiedResLog = null;

        if (req.originalUrl.includes('MajorLogin') && resBuffer.length > 0) {
            console.log("💉 Intercepted MajorLogin, preparing injection...");
            const { dec: decryptedRes, prefix } = smartDecrypt(resBuffer);
            
            if (decryptedRes) {
                let jsonRes = await decodeWithPythonRaw('LoginRes', decryptedRes);
                
                if (jsonRes && jsonRes.server_url) {
                    const oldUrl = jsonRes.server_url;
                    jsonRes.server_url = MY_PROXY_URL;
                    modifiedResLog = JSON.stringify(jsonRes, null, 2);
                    
                    console.log(`✅ Injecting URL: ${oldUrl} -> ${MY_PROXY_URL}`);

                    let reEncodedBin = await encodeWithPythonRaw('LoginRes', jsonRes);
                    if (reEncodedBin) {
                        let reEncryptedBin = encryptData(reEncodedBin, prefix);
                        if (reEncryptedBin) {
                            resBuffer = reEncryptedBin;
                        }
                    }
                }
            }
        }

        garenaResponse.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) res.setHeader(n, v);
        });
        res.status(garenaResponse.status).send(resBuffer);

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

app.listen(process.env.PORT || 3000, () => {
    console.log('🚀 KING NEXUS V9 Running on port 3000');
    console.log('📊 Dashboard: http://localhost:3000/romeo/ds');
});