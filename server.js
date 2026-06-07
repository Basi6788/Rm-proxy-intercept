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
let allTimeLogs = [];

// ==========================================
// 🗺️ ROUTER MAP
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
// 🛠️ CRYPTO ENGINE
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
// JWT GENERATOR API
// ===================================================
app.use(express.json());

app.post('/api/generate-jwt', async (req, res) => {
    try {
        let guest_account_info = null;
        
        if (req.body.guest_account_info) {
            guest_account_info = req.body.guest_account_info;
        } else if (req.body['com.garena.msdk.guest_uid']) {
            guest_account_info = {
                'com.garena.msdk.guest_uid': req.body['com.garena.msdk.guest_uid'],
                'com.garena.msdk.guest_password': req.body['com.garena.msdk.guest_password']
            };
        }
        
        if (guest_account_info && guest_account_info['com.garena.msdk.guest_password']) {
            guest_account_info['com.garena.msdk.guest_password'] = 
                guest_account_info['com.garena.msdk.guest_password'].replace(/[\s\n\r]/g, '');
        }
        
        const uid = guest_account_info?.['com.garena.msdk.guest_uid'];
        const password = guest_account_info?.['com.garena.msdk.guest_password'];
        
        if (!uid || !password) {
            return res.status(400).json({ error: 'Invalid credentials: Missing UID or password' });
        }
        
        console.log(`[JWT] Generating for UID: ${uid}`);
        
        const loginReq = {
            uid: uid,
            password: password,
            platform: 1,
            version: "OB53"
        };
        
        const encodedReq = await encodeWithPythonRaw('LoginReq', loginReq);
        if (!encodedReq) throw new Error('Failed to encode request');
        
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
            return res.status(500).json({ error: jsonRes?.error || 'Token generation failed - Invalid guest account' });
        }
        
    } catch (error) {
        console.error('[JWT Error]', error);
        return res.status(500).json({ error: error.message });
    }
});

// ==========================================
// API ROUTES
// ==========================================
app.get('/api/internal/logs/sync', (req, res) => {
    const logsToSend = [...requestLogsBuffer];
    requestLogsBuffer = [];
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
// 🎨 DASHBOARD WITH SPRING & WINTER THEMES
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>🌸 KING NEXUS V9 | Seasonal Edition</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            * { font-family: 'Inter', sans-serif; }
            
            /* Spring Theme (Default) */
            body.spring {
                background: linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 25%, #1a0a2e 50%, #2d1b4e 75%, #1a0a2e 100%);
                position: relative;
                min-height: 100vh;
            }
            
            body.spring::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: 
                    linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px);
                background-size: 40px 40px;
                pointer-events: none;
            }
            
            /* Winter Theme */
            body.winter {
                background: linear-gradient(135deg, #0f2027 0%, #203a43 25%, #2c5364 50%, #203a43 75%, #0f2027 100%);
                position: relative;
                min-height: 100vh;
            }
            
            body.winter::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: 
                    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                background-size: 40px 40px;
                pointer-events: none;
            }
            
            /* Snow Effect */
            .snow-flake {
                position: fixed;
                color: white;
                user-select: none;
                pointer-events: none;
                z-index: 9999;
                animation: fall linear forwards;
            }
            
            @keyframes fall {
                to {
                    transform: translateY(100vh);
                    opacity: 0;
                }
            }
            
            /* Spring Glass Panel */
            body.spring .glass-panel {
                background: rgba(25, 15, 45, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(168, 85, 247, 0.3);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            body.spring .glass-panel::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.15), transparent);
                transition: left 0.5s;
            }
            
            body.spring .glass-panel:hover::before {
                left: 100%;
            }
            
            body.spring .glass-panel:hover {
                border-color: rgba(168, 85, 247, 0.7);
                box-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
                transform: translateY(-2px);
            }
            
            /* Winter Glass Panel */
            body.winter .glass-panel {
                background: rgba(15, 32, 39, 0.7);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(100, 200, 255, 0.3);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }
            
            body.winter .glass-panel::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(100, 200, 255, 0.15), transparent);
                transition: left 0.5s;
            }
            
            body.winter .glass-panel:hover::before {
                left: 100%;
            }
            
            body.winter .glass-panel:hover {
                border-color: rgba(100, 200, 255, 0.7);
                box-shadow: 0 0 30px rgba(100, 200, 255, 0.3);
                transform: translateY(-2px);
            }
            
            /* Spring Button */
            body.spring .btn-primary {
                background: linear-gradient(135deg, #a855f7 0%, #d946ef 50%, #ec4899 100%);
                transition: all 0.2s ease;
            }
            
            body.spring .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(168, 85, 247, 0.5);
            }
            
            /* Winter Button */
            body.winter .btn-primary {
                background: linear-gradient(135deg, #38bdf8 0%, #00d4ff 50%, #7dd3fc 100%);
                transition: all 0.2s ease;
            }
            
            body.winter .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.5);
            }
            
            /* Spring Outline Button */
            body.spring .btn-outline {
                background: transparent;
                border: 1px solid rgba(168, 85, 247, 0.4);
                transition: all 0.2s ease;
            }
            
            body.spring .btn-outline:hover {
                background: rgba(168, 85, 247, 0.15);
                border-color: rgba(168, 85, 247, 0.8);
                box-shadow: 0 0 15px rgba(168, 85, 247, 0.2);
            }
            
            /* Winter Outline Button */
            body.winter .btn-outline {
                background: transparent;
                border: 1px solid rgba(56, 189, 248, 0.4);
                transition: all 0.2s ease;
            }
            
            body.winter .btn-outline:hover {
                background: rgba(56, 189, 248, 0.15);
                border-color: rgba(56, 189, 248, 0.8);
                box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
            }
            
            /* Spring Input */
            body.spring .input-dark {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(168, 85, 247, 0.3);
                transition: all 0.2s ease;
                color: #f0e6ff;
            }
            
            body.spring .input-dark:focus {
                border-color: #a855f7;
                outline: none;
                box-shadow: 0 0 15px rgba(168, 85, 247, 0.3);
            }
            
            /* Winter Input */
            body.winter .input-dark {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(56, 189, 248, 0.3);
                transition: all 0.2s ease;
                color: #e0f2fe;
            }
            
            body.winter .input-dark:focus {
                border-color: #38bdf8;
                outline: none;
                box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
            }
            
            /* Spring Tab */
            body.spring .tab-active {
                background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%);
                border-bottom: 2px solid #a855f7;
                color: #c084fc;
            }
            
            /* Winter Tab */
            body.winter .tab-active {
                background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(0, 212, 255, 0.1) 100%);
                border-bottom: 2px solid #38bdf8;
                color: #7dd3fc;
            }
            
            body.spring .glow-text {
                text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
            }
            
            body.winter .glow-text {
                text-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
            }
            
            .code-block {
                background: rgba(0, 0, 0, 0.6);
                border-radius: 12px;
                padding: 16px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                overflow-x: auto;
            }
            
            body.spring .code-block {
                border: 1px solid rgba(168, 85, 247, 0.2);
            }
            
            body.winter .code-block {
                border: 1px solid rgba(56, 189, 248, 0.2);
            }
            
            .log-entry {
                transition: all 0.2s ease;
            }
            
            .log-entry:hover {
                transform: translateX(4px);
            }
            
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.3); }
            body.spring ::-webkit-scrollbar-thumb { background: #a855f7; border-radius: 10px; }
            body.winter ::-webkit-scrollbar-thumb { background: #38bdf8; border-radius: 10px; }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-5px); }
            }
            
            .float-animation {
                animation: float 3s ease-in-out infinite;
            }
            
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 5px rgba(168, 85, 247, 0.3); }
                50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.6); }
            }
            
            body.spring .pulse-glow {
                animation: pulse-glow 2s ease-in-out infinite;
            }
            
            body.winter .pulse-glow {
                animation: pulse-glow 2s ease-in-out infinite;
                box-shadow: 0 0 5px rgba(56, 189, 248, 0.3);
            }
        </style>
    </head>
    <body class="spring">
        <div class="max-w-7xl mx-auto p-4 md:p-8 relative z-10">
            <!-- Header with Theme Toggle -->
            <div class="glass-panel rounded-2xl p-6 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-2xl flex items-center justify-center float-animation">
                            <i class="fas fa-crown text-white text-3xl"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl md:text-5xl font-black glow-text" style="background: linear-gradient(135deg, #c084fc, #f472b6, #fb7185); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                KING NEXUS V9
                            </h1>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="w-2 h-2 rounded-full bg-green-400 pulse-glow"></div>
                                <p class="text-xs text-purple-300/80 font-semibold uppercase tracking-wider" id="seasonLabel">🌸 SPRING EDITION | ACTIVE INJECTION MODE</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 items-center">
                        <!-- Theme Toggle -->
                        <div class="theme-toggle flex gap-2 bg-black/30 rounded-full p-1">
                            <button onclick="setTheme('spring')" id="springBtn" class="px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 bg-purple-500/30 text-purple-300">
                                <i class="fas fa-seedling"></i> Spring
                            </button>
                            <button onclick="setTheme('winter')" id="winterBtn" class="px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 text-cyan-300/70 hover:bg-cyan-500/20">
                                <i class="fas fa-snowflake"></i> Winter
                            </button>
                        </div>
                        
                        <button onclick="nukeEverything()" class="bg-red-950/40 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-all text-sm font-semibold border border-red-500/30 hover:shadow-lg hover:shadow-red-500/20">
                            <i class="fas fa-trash-alt mr-2"></i>CLEAR ALL
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Tabs -->
            <div class="flex gap-2 mb-6 bg-black/20 rounded-xl p-1 backdrop-blur-sm">
                <button onclick="showTab('logs')" id="tab-logs-btn" class="tab-spring flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 tab-active">
                    <i class="fas fa-tachometer-alt"></i> LIVE LOGS
                </button>
                <button onclick="showTab('jwt')" id="tab-jwt-btn" class="tab-spring flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 text-purple-400/60 hover:text-purple-400">
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
                        <div class="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-key text-white text-xl"></i>
                        </div>
                        <div>
                            <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400">JWT Token Generator</h2>
                            <p class="text-xs text-purple-400/70">Generate JWT token from guest account credentials</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-purple-400/80 mb-2">
                                <i class="fas fa-code mr-1"></i> Guest Account JSON
                            </label>
                            <textarea id="jsonInput" rows="5" class="w-full input-dark rounded-xl p-4 text-sm font-mono" placeholder='{"guest_account_info":{"com.garena.msdk.guest_password":"344D0EC1ACC234C7D283B0A11954147F18A4AD38F3F3F8C4B7E53AB43D19FD2A","com.garena.msdk.guest_uid":"4627647913"}}'></textarea>
                        </div>
                        
                        <div class="flex gap-3 flex-wrap">
                            <button onclick="generateJWT()" class="btn-primary px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2">
                                <i class="fas fa-magic"></i> Generate Token
                            </button>
                            <button onclick="clearJWT()" class="btn-outline px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-eraser"></i> Clear
                            </button>
                            <button onclick="loadExample()" class="btn-outline px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                                <i class="fas fa-file-alt"></i> Load Example
                            </button>
                        </div>
                        
                        <!-- Result Area -->
                        <div id="jwtResult" class="hidden mt-6">
                            <div class="bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-rose-900/30 rounded-xl p-5 border border-purple-500/30">
                                <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <p class="text-green-400 text-sm font-bold flex items-center gap-2">
                                        <i class="fas fa-check-circle"></i> TOKEN GENERATED SUCCESSFULLY
                                    </p>
                                    <button onclick="copyToken()" class="text-purple-400/70 hover:text-purple-400 text-sm transition-all">
                                        <i class="fas fa-copy"></i> Copy Token
                                    </button>
                                </div>
                                <div class="code-block">
                                    <code id="tokenOutput" class="text-purple-300 break-all text-xs"></code>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-purple-400/70">UID:</span>
                                        <span id="resultUid" class="text-purple-300 ml-2 font-mono"></span>
                                    </div>
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-purple-400/70">Region:</span>
                                        <span id="resultRegion" class="text-purple-300 ml-2 font-mono"></span>
                                    </div>
                                    <div class="bg-black/30 rounded-lg p-2">
                                        <span class="text-purple-400/70">Server:</span>
                                        <span id="resultServer" class="text-purple-300 ml-2 font-mono text-xs truncate"></span>
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
                            <i class="fas fa-history text-purple-400 text-xl"></i>
                            <h3 class="text-lg font-bold text-white">📋 All Captured Logs</h3>
                            <span id="logCount" class="text-xs bg-purple-500/20 px-2 py-1 rounded-full text-purple-400">0</span>
                        </div>
                        <button onclick="refreshAllLogs()" class="btn-outline px-3 py-1 rounded-lg text-xs">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                    <div id="allLogsList" class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        <div class="text-center text-purple-500/50 py-8">
                            <i class="fas fa-inbox text-3xl mb-2"></i>
                            <p>No logs captured yet. Proxy activity will appear here.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script>
            const db = new Dexie("NexusV9DB");
            db.version(1).stores({ logs: 'id, timestamp, method, targetHost, path, status, duration' });
            
            let currentTheme = 'spring';
            let snowInterval = null;
            
            function setTheme(theme) {
                currentTheme = theme;
                document.body.classList.remove('spring', 'winter');
                document.body.classList.add(theme);
                
                // Update buttons
                const springBtn = document.getElementById('springBtn');
                const winterBtn = document.getElementById('winterBtn');
                const seasonLabel = document.getElementById('seasonLabel');
                
                if (theme === 'spring') {
                    springBtn.classList.add('bg-purple-500/30', 'text-purple-300');
                    springBtn.classList.remove('text-cyan-300/70');
                    winterBtn.classList.remove('bg-cyan-500/30', 'text-cyan-300');
                    winterBtn.classList.add('text-cyan-300/70');
                    seasonLabel.innerHTML = '🌸 SPRING EDITION | ACTIVE INJECTION MODE';
                    seasonLabel.className = 'text-xs text-purple-300/80 font-semibold uppercase tracking-wider';
                    stopSnow();
                } else {
                    winterBtn.classList.add('bg-cyan-500/30', 'text-cyan-300');
                    winterBtn.classList.remove('text-cyan-300/70');
                    springBtn.classList.remove('bg-purple-500/30', 'text-purple-300');
                    springBtn.classList.add('text-purple-300/70');
                    seasonLabel.innerHTML = '❄️ WINTER EDITION | ACTIVE INJECTION MODE';
                    seasonLabel.className = 'text-xs text-cyan-300/80 font-semibold uppercase tracking-wider';
                    startSnow();
                }
            }
            
            function startSnow() {
                stopSnow();
                snowInterval = setInterval(createSnowflake, 200);
            }
            
            function stopSnow() {
                if (snowInterval) {
                    clearInterval(snowInterval);
                    snowInterval = null;
                }
                document.querySelectorAll('.snow-flake').forEach(s => s.remove());
            }
            
            function createSnowflake() {
                if (currentTheme !== 'winter') return;
                const snowflake = document.createElement('div');
                snowflake.classList.add('snow-flake');
                snowflake.innerHTML = ['❄️', '❄️', '❄️', '❄️', '❄️', '❄️', '❄️', '❄️'][Math.floor(Math.random() * 8)];
                snowflake.style.left = Math.random() * 100 + '%';
                snowflake.style.fontSize = (Math.random() * 10 + 10) + 'px';
                snowflake.style.opacity = Math.random() * 0.6 + 0.3;
                snowflake.style.animationDuration = Math.random() * 4 + 3 + 's';
                document.body.appendChild(snowflake);
                setTimeout(() => snowflake.remove(), 7000);
            }
            
            async function syncServerData() {
                try {
                    const res = await fetch('/api/internal/logs/sync');
                    const newLogs = await res.json();
                    if(newLogs.length > 0) { 
                        await db.logs.bulkPut(newLogs); 
                        if(true) appendNewLogs(newLogs); 
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
                        container.innerHTML = '<div class="text-center text-purple-500/50 py-8"><i class="fas fa-inbox text-3xl mb-2"></i><p>No logs captured yet. Proxy activity will appear here.</p></div>';
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
                    <div class="log-entry bg-black/20 rounded-lg p-3 border border-purple-500/10 hover:border-purple-500/30 transition-all">
                        <div class="flex justify-between items-start gap-2 flex-wrap">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-xs font-mono">\${log.method}</span>
                                <span class="text-cyan-300 text-xs font-mono break-all">[\${log.targetHost}] \${log.path}</span>
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
                    <div class="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-purple-500/20 gap-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="bg-purple-900/40 text-purple-300 px-2 py-1 rounded text-xs font-bold">\${log.method}</span>
                            <span class="text-cyan-300 text-xs font-mono">[\${log.targetHost}] \${log.path}</span>
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
                            <div class="text-purple-400/70 text-xs mb-2 font-semibold flex items-center gap-1">
                                <i class="fas fa-arrow-up"></i> REQUEST
                            </div>
                            <pre class="bg-black/50 rounded-lg p-3 text-xs text-purple-300/80 overflow-x-auto max-h-48">\${log.req || '[EMPTY]'}</pre>
                        </div>
                        <div>
                            <div class="text-purple-400/70 text-xs mb-2 font-semibold flex items-center gap-1">
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
                let logs = await db.logs.orderBy('id').reverse().toArray();
                document.getElementById('logs-container').innerHTML = logs.length ? logs.map(generateLogHTML).join('') : '<div class="text-center text-purple-500/50 py-12"><i class="fas fa-inbox text-4xl mb-2"></i><p>No logs found</p></div>';
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
                    logsBtn.classList.add('tab-active');
                    logsBtn.classList.remove('text-purple-400/60');
                    jwtBtn.classList.remove('tab-active');
                    jwtBtn.classList.add('text-purple-400/60');
                    fullRender();
                } else {
                    logsContainer.classList.add('hidden');
                    jwtContainer.classList.remove('hidden');
                    jwtBtn.classList.add('tab-active');
                    jwtBtn.classList.remove('text-purple-400/60');
                    logsBtn.classList.remove('tab-active');
                    logsBtn.classList.add('text-purple-400/60');
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
                    
                    if (parsed.guest_account_info && parsed.guest_account_info['com.garena.msdk.guest_password']) {
                        parsed.guest_account_info['com.garena.msdk.guest_password'] = 
                            parsed.guest_account_info['com.garena.msdk.guest_password'].replace(/[\\s\\n\\r]/g, '');
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
                        showError(data.error || "Token generation failed!");
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
            "billboard_msg": "👑 KING NEXUS V9: HIJACKER ENGINE",
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
    console.log('🌸 KING NEXUS V9 - Seasonal Edition Running on port 3000');
    console.log('📊 Dashboard: http://localhost:3000/romeo/ds');
});