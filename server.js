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
let allTimeLogs = []; // Store all logs permanently

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
// 🆕 JWT GENERATOR API - FIXED
// ===================================================
app.use(express.json());

app.post('/api/generate-jwt', async (req, res) => {
    try {
        console.log('[JWT Tool] Received body:', JSON.stringify(req.body));
        
        // Handle multiple possible input formats
        let guest_account_info = null;
        
        if (req.body.guest_account_info) {
            guest_account_info = req.body.guest_account_info;
        } else if (req.body['com.garena.msdk.guest_uid']) {
            guest_account_info = {
                'com.garena.msdk.guest_uid': req.body['com.garena.msdk.guest_uid'],
                'com.garena.msdk.guest_password': req.body['com.garena.msdk.guest_password']
            };
        } else {
            // Try to find any fields
            guest_account_info = {
                'com.garena.msdk.guest_uid': req.body.uid || req.body.guest_uid,
                'com.garena.msdk.guest_password': req.body.password || req.body.guest_password
            };
        }
        
        // Clean password (remove spaces, newlines)
        if (guest_account_info && guest_account_info['com.garena.msdk.guest_password']) {
            guest_account_info['com.garena.msdk.guest_password'] = 
                guest_account_info['com.garena.msdk.guest_password'].replace(/[\s\n\r]/g, '');
        }
        
        const uid = guest_account_info?.['com.garena.msdk.guest_uid'];
        const password = guest_account_info?.['com.garena.msdk.guest_password'];
        
        if (!uid || !password) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                hint: 'Use format: {"guest_account_info": {"com.garena.msdk.guest_uid": "...", "com.garena.msdk.guest_password": "..."}}'
            });
        }
        
        console.log(`[JWT Tool] Generating token for UID: ${uid}`);
        console.log(`[JWT Tool] Password length: ${password.length}`);
        
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
                lock_region: jsonRes.lock_region || 'Global'
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
    // Store in permanent logs
    allTimeLogs.unshift(...logsToSend);
    if (allTimeLogs.length > 200) allTimeLogs = allTimeLogs.slice(0, 200);
    res.json(logsToSend);
});

app.get('/api/internal/all-logs', (req, res) => {
    res.json(allTimeLogs);
});

app.post('/api/internal/clear', (req, res) => {
    requestLogsBuffer = [];
    allTimeLogs = [];
    res.json({ success: true });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// ==========================================
// 🎨 SPRING GREEN THEME DASHBOARD
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>🌸 KING NEXUS V9 | Spring Edition</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            
            body { 
                background: linear-gradient(135deg, #0a2e1a 0%, #1a4a2a 25%, #0d2818 50%, #1a3a2a 75%, #0a2e1a 100%);
                min-height: 100vh;
                position: relative;
            }
            
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="rgba(34,197,94,0.05)" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') repeat-x bottom;
                background-size: cover;
                opacity: 0.3;
                pointer-events: none;
            }
            
            .glass-panel {
                background: rgba(20, 40, 25, 0.75);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(74, 222, 128, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            .glass-panel::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(74, 222, 128, 0.1), transparent);
                transition: left 0.5s;
            }
            
            .glass-panel:hover::before {
                left: 100%;
            }
            
            .glass-panel:hover {
                border-color: rgba(74, 222, 128, 0.6);
                box-shadow: 0 0 30px rgba(74, 222, 128, 0.2);
                transform: translateY(-2px);
            }
            
            .glow-text {
                text-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
            }
            
            .btn-spring {
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .btn-spring:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(34, 197, 94, 0.4);
            }
            
            .btn-spring:active {
                transform: translateY(0);
            }
            
            .btn-outline-spring {
                background: transparent;
                border: 1px solid rgba(74, 222, 128, 0.4);
                transition: all 0.2s ease;
            }
            
            .btn-outline-spring:hover {
                background: rgba(74, 222, 128, 0.1);
                border-color: rgba(74, 222, 128, 0.8);
                box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
            }
            
            .input-spring {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(74, 222, 128, 0.2);
                transition: all 0.2s ease;
                color: #dcfce7;
            }
            
            .input-spring:focus {
                border-color: #22c55e;
                outline: none;
                box-shadow: 0 0 15px rgba(34, 197, 94, 0.3);
                background: rgba(0, 0, 0, 0.7);
            }
            
            .tab-spring {
                transition: all 0.2s ease;
                position: relative;
            }
            
            .tab-active-spring {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%);
                border-bottom: 2px solid #22c55e;
                color: #22c55e;
            }
            
            .tab-spring:hover:not(.tab-active-spring) {
                background: rgba(34, 197, 94, 0.1);
                transform: translateY(-1px);
            }
            
            .code-block {
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid rgba(74, 222, 128, 0.2);
                border-radius: 12px;
                padding: 16px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                overflow-x: auto;
            }
            
            .log-entry {
                transition: all 0.2s ease;
            }
            
            .log-entry:hover {
                transform: translateX(4px);
            }
            
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #0a2e1a; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 10px; }
            ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-5px); }
            }
            
            .float-animation {
                animation: float 3s ease-in-out infinite;
            }
            
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.3); }
                50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.6); }
            }
            
            .pulse-glow {
                animation: pulse-glow 2s ease-in-out infinite;
            }
            
            .theme-toggle {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 60px;
                padding: 4px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .theme-option {
                padding: 6px 12px;
                border-radius: 50px;
                transition: all 0.2s;
                font-size: 12px;
                font-weight: 600;
            }
            
            .theme-option.active {
                background: #22c55e;
                color: white;
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
            }
        </style>
    </head>
    <body class="p-4 md:p-8">
        <div class="max-w-7xl mx-auto relative z-10">
            <!-- Header with Theme Toggle -->
            <div class="glass-panel rounded-2xl p-6 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center float-animation">
                            <i class="fas fa-crown text-white text-3xl"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl md:text-5xl font-black glow-text" style="background: linear-gradient(135deg, #22c55e, #16a34a, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                KING NEXUS V9
                            </h1>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="w-2 h-2 rounded-full bg-green-400 pulse-glow"></div>
                                <p class="text-xs text-green-400/80 font-semibold uppercase tracking-wider">🌸 SPRING EDITION | ACTIVE INJECTION MODE</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 items-center">
                        <!-- Theme Toggle -->
                        <div class="theme-toggle flex gap-1">
                            <div class="theme-option active" data-theme="spring" onclick="switchTheme('spring')">
                                <i class="fas fa-seedling"></i> Spring
                            </div>
                            <div class="theme-option" data-theme="summer" onclick="switchTheme('summer')">
                                <i class="fas fa-sun"></i> Summer
                            </div>
                        </div>
                        
                        <div class="relative">
                            <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500/50 text-xs"></i>
                            <input type="text" id="searchBox" oninput="filterLogs()" placeholder="Search logs..." class="input-spring pl-8 pr-3 py-2 rounded-lg text-sm w-48 md:w-64">
                        </div>
                        <button onclick="nukeEverything()" class="bg-red-950/40 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-all text-sm font-semibold border border-red-500/30 hover:shadow-lg hover:shadow-red-500/20">
                            <i class="fas fa-trash-alt mr-2"></i>CLEAR
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="flex gap-2 mb-6 bg-black/20 rounded-xl p-1 backdrop-blur-sm">
                <button onclick="showTab('logs')" id="tab-logs-btn" class="tab-spring flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 tab-active-spring">
                    <i class="fas fa-tachometer-alt"></i> LIVE LOGS
                </button>
                <button onclick="showTab('jwt')" id="tab-jwt-btn" class="tab-spring flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 text-green-400/60 hover:text-green-400">
                    <i class="fas fa-key"></i> JWT GENERATOR
                </button>
            </div>
            
            <!-- Logs Container -->
            <div id="logs-container" class="space-y-3 max-h-[600px] overflow-y-auto pr-2"></div>
            
            <!-- JWT Tool Container with Logs Below -->
            <div id="jwt-container" class="hidden">
                <!-- JWT Generator Panel -->
                <div class="glass-panel rounded-2xl p-6 mb-6">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <i class="fas fa-key text-white text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">JWT Token Generator</h2>
                            <p class="text-xs text-green-400/70">Generate JWT token from guest account credentials</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-green-400/80 mb-2">
                                <i class="fas fa-code mr-1"></i> Paste Guest Account JSON
                            </label>
                            <textarea id="jsonInput" rows="6" class="w-full input-spring rounded-xl p-4 text-sm font-mono" placeholder='{"guest_account_info":{"com.garena.msdk.guest_password":"344D0EC1ACC234C7D283B0A11954147F18A4AD38F3F3F8C4B7E53AB43D19FD2A","com.garena.msdk.guest_uid":"4627647913"}}'></textarea>
                            <p class="text-xs text-green-500/50 mt-2">
                                <i class="fas fa-info-circle"></i> Spaces and line breaks are automatically handled
                            </p>
                        </div>
                        
                        <div class="flex gap-3 flex-wrap">
                            <button onclick="generateJWT()" class="btn-spring px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
                                <i class="fas fa-magic"></i> Generate Token
                            </button>
                            <button onclick="clearJWT()" class="btn-outline-spring px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-eraser"></i> Clear
                            </button>
                            <button onclick="loadExample()" class="btn-outline-spring px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-file-alt"></i> Load Example
                            </button>
                        </div>
                        
                        <!-- Result Area -->
                        <div id="jwtResult" class="hidden mt-6">
                            <div class="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-5 border border-green-500/30">
                                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <p class="text-green-400 text-sm font-bold flex items-center gap-2">
                                        <i class="fas fa-check-circle"></i> TOKEN GENERATED SUCCESSFULLY
                                    </p>
                                    <button onclick="copyToken()" class="text-green-400/70 hover:text-green-400 text-sm transition-all">
                                        <i class="fas fa-copy"></i> Copy Token
                                    </button>
                                </div>
                                <div class="code-block">
                                    <code id="tokenOutput" class="text-green-300 break-all text-xs"></code>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-green-500/70">UID:</span>
                                        <span id="resultUid" class="text-green-300 ml-2 font-mono"></span>
                                    </div>
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-green-500/70">Region:</span>
                                        <span id="resultRegion" class="text-green-300 ml-2 font-mono"></span>
                                    </div>
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-green-500/70">Server:</span>
                                        <span id="resultServer" class="text-green-300 ml-2 font-mono text-xs truncate"></span>
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
                
                <!-- ALL LOGS Section Below JWT Generator -->
                <div class="glass-panel rounded-2xl p-6">
                    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-history text-green-400 text-xl"></i>
                            <h3 class="text-lg font-bold text-white">📋 All Captured Logs</h3>
                            <span id="logCount" class="text-xs bg-green-500/20 px-2 py-1 rounded-full text-green-400">0</span>
                        </div>
                        <button onclick="refreshAllLogs()" class="btn-outline-spring px-3 py-1 rounded-lg text-xs">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div id="allLogsList" class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        <div class="text-center text-green-500/50 py-8">
                            <i class="fas fa-inbox text-3xl mb-2"></i>
                            <p>No logs captured yet. Proxy activity will appear here.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style id="theme-styles">
            /* Summer theme styles */
            .theme-summer body {
                background: linear-gradient(135deg, #3b2a1a 0%, #5a3a2a 25%, #2a1a0a 50%, #4a2a1a 75%, #3b2a1a 100%);
            }
            .theme-summer .glass-panel {
                background: rgba(60, 40, 25, 0.75);
                border-color: rgba(251, 146, 60, 0.2);
            }
            .theme-summer .glass-panel:hover {
                border-color: rgba(251, 146, 60, 0.6);
                box-shadow: 0 0 30px rgba(251, 146, 60, 0.2);
            }
            .theme-summer .glow-text {
                text-shadow: 0 0 20px rgba(251, 146, 60, 0.4);
            }
            .theme-summer .btn-spring {
                background: linear-gradient(135deg, #fb923c 0%, #ea580c 50%, #c2410c 100%);
            }
            .theme-summer .tab-active-spring {
                background: linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(234, 88, 12, 0.1) 100%);
                border-bottom-color: #fb923c;
                color: #fb923c;
            }
        </style>

        <script>
            const db = new Dexie("NexusV9DB");
            db.version(1).stores({ logs: 'id, timestamp, method, targetHost, path, status, duration' });
            
            let currentTheme = 'spring';
            
            function switchTheme(theme) {
                currentTheme = theme;
                document.body.classList.remove('theme-spring', 'theme-summer');
                if (theme === 'summer') {
                    document.body.classList.add('theme-summer');
                } else {
                    document.body.classList.add('theme-spring');
                }
                
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.remove('active');
                    if (opt.getAttribute('data-theme') === theme) {
                        opt.classList.add('active');
                    }
                });
            }
            
            async function syncServerData() {
                try {
                    const res = await fetch('/api/internal/logs/sync');
                    const newLogs = await res.json();
                    if(newLogs.length > 0) { 
                        await db.logs.bulkPut(newLogs); 
                        if(document.getElementById('searchBox').value.trim() === "") appendNewLogs(newLogs); 
                        else fullRender(); 
                    }
                    refreshAllLogs();
                } catch(e) {}
            }
            
            async function refreshAllLogs() {
                try {
                    const res = await fetch('/api/internal/all-logs');
                    const logs = await res.json();
                    document.getElementById('logCount').innerText = logs.length;
                    const container = document.getElementById('allLogsList');
                    if (logs.length === 0) {
                        container.innerHTML = '<div class="text-center text-green-500/50 py-8"><i class="fas fa-inbox text-3xl mb-2"></i><p>No logs captured yet. Proxy activity will appear here.</p></div>';
                        return;
                    }
                    container.innerHTML = logs.slice(0, 100).map(log => generateCompactLogHTML(log)).join('');
                } catch(e) {}
            }
            
            function generateCompactLogHTML(log) {
                let isError = log.status >= 400;
                let statusColor = isError ? 'text-red-400' : 'text-green-400';
                let statusBg = isError ? 'bg-red-950/30' : 'bg-green-950/30';
                return \`
                    <div class="log-entry bg-black/20 rounded-lg p-3 border border-green-500/10 hover:border-green-500/30 transition-all">
                        <div class="flex justify-between items-start gap-2 flex-wrap">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="bg-green-900/40 text-green-300 px-2 py-0.5 rounded text-xs font-mono">\${log.method}</span>
                                <span class="text-blue-300 text-xs font-mono break-all">[\${log.targetHost}] \${log.path}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-gray-500 text-xs">\${log.timestamp}</span>
                                <span class="\${statusColor} \${statusBg} px-2 py-0.5 rounded text-xs font-bold">\${log.status}</span>
                            </div>
                        </div>
                        <div class="mt-2 text-xs text-gray-400 truncate">
                            <i class="fas fa-arrow-up mr-1"></i>\${(log.req || 'EMPTY').substring(0, 100)}...
                        </div>
                    </div>
                \`;
            }
            
            function generateLogHTML(log) {
                let isError = log.status >= 400;
                let statusColor = isError ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30';
                let statusIcon = isError ? 'fa-times-circle' : 'fa-check-circle';
                return \`
                <div class="glass-panel rounded-xl p-4 log-entry">
                    <div class="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-green-500/20 gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="bg-green-900/40 text-green-300 px-2 py-1 rounded text-xs font-bold">\${log.method}</span>
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
                            <div class="text-green-500/70 text-xs mb-2 font-semibold flex items-center gap-1">
                                <i class="fas fa-arrow-up"></i> REQUEST
                            </div>
                            <pre class="bg-black/50 rounded-lg p-3 text-xs text-green-300/80 overflow-x-auto max-h-48">\${log.req || '[EMPTY]'}</pre>
                        </div>
                        <div>
                            <div class="text-green-500/70 text-xs mb-2 font-semibold flex items-center gap-1">
                                <i class="fas fa-arrow-down"></i> RESPONSE
                            </div>
                            <pre class="bg-black/50 rounded-lg p-3 text-xs \${isError ? 'text-red-300/80' : 'text-emerald-300/80'} overflow-x-auto max-h-48">\${log.res || '[EMPTY]'}</pre>
                        </div>
                    </div>
                </div>\`;
            }

            function appendNewLogs(newLogs) {
                document.getElementById('logs-container').insertAdjacentHTML('afterbegin', newLogs.map(generateLogHTML).join(''));
                refreshAllLogs();
            }
            
            async function fullRender() {
                const term = document.getElementById('searchBox').value.toLowerCase();
                let logs = await db.logs.orderBy('id').reverse().toArray();
                if(term) logs = logs.filter(l => l.path.toLowerCase().includes(term) || String(l.status).includes(term) || l.targetHost.toLowerCase().includes(term));
                document.getElementById('logs-container').innerHTML = logs.length ? logs.map(generateLogHTML).join('') : '<div class="text-center text-green-500/50 py-12"><i class="fas fa-inbox text-4xl mb-2"></i><p>No logs found</p></div>';
            }
            
            function filterLogs() {
                fullRender();
            }
            
            async function nukeEverything() {
                await fetch('/api/internal/clear', { method: 'POST' });
                await db.logs.clear();
                fullRender();
                refreshAllLogs();
            }
            
            function showTab(tab) {
                const logsContainer = document.getElementById('logs-container');
                const jwtContainer = document.getElementById('jwt-container');
                const logsBtn = document.getElementById('tab-logs-btn');
                const jwtBtn = document.getElementById('tab-jwt-btn');
                
                if(tab === 'logs') {
                    logsContainer.classList.remove('hidden');
                    jwtContainer.classList.add('hidden');
                    logsBtn.classList.add('tab-active-spring');
                    logsBtn.classList.remove('text-green-400/60');
                    jwtBtn.classList.remove('tab-active-spring');
                    jwtBtn.classList.add('text-green-400/60');
                    fullRender();
                } else {
                    logsContainer.classList.add('hidden');
                    jwtContainer.classList.remove('hidden');
                    jwtBtn.classList.add('tab-active-spring');
                    jwtBtn.classList.remove('text-green-400/60');
                    logsBtn.classList.remove('tab-active-spring');
                    logsBtn.classList.add('text-green-400/60');
                    refreshAllLogs();
                }
            }
            
            function loadExample() {
                document.getElementById('jsonInput').value = '{"guest_account_info":{"com.garena.msdk.guest_password":"344D0EC1ACC234C7D283B0A11954147F18A4AD38F3F3F8C4B7E53AB43D19FD2A","com.garena.msdk.guest_uid":"4627647913"}}';
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
                            parsed.guest_account_info['com.garena.msdk.guest_password'].replace(/[\\s\\n\\r]/g, '');
                    }
                    
                    if(!parsed.guest_account_info || !parsed.guest_account_info['com.garena.msdk.guest_uid'] || !parsed.guest_account_info['com.garena.msdk.guest_password']) {
                        showError("Invalid format! Required: guest_account_info with com.garena.msdk.guest_uid and com.garena.msdk.guest_password");
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
                        document.getElementById('resultRegion').innerText = data.lock_region || 'Global';
                        document.getElementById('resultServer').innerText = data.server_url || 'N/A';
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
            "billboard_msg": "🌸 KING NEXUS V9: SPRING HIJACKER",
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

    const logEntry = {
        id: Date.now() + '-' + Math.floor(Math.random()*10000),
        timestamp: new Date().toLocaleTimeString(),
        method, targetHost, path: originalUrl, status,
        duration: `${Date.now() - startTime}ms`,
        req: parsedReqLog, res: parsedResLog
    };
    
    requestLogsBuffer.push(logEntry);
    allTimeLogs.unshift(logEntry);
    if (allTimeLogs.length > 200) allTimeLogs = allTimeLogs.slice(0, 200);
}

app.listen(process.env.PORT || 3000, () => {
    console.log('🌸 KING NEXUS V9 - Spring Edition Running on port 3000');
    console.log('📊 Dashboard: http://localhost:3000/romeo/ds');
});