const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 1. FREE FIRE ASLI HTTP/API DIRECTORY SERVER
const TARGET_URL = 'https://dl.dir.freefiremobile.com'; 

let requestLogs = []; 
let gameItemsDB = {}; 
let defaultBundleId = "100123"; 

// ==========================================
// 📥 LOCAL FILES AUTO-LOADER (/public folder)
// ==========================================
function loadLocalItems() {
    try {
        const publicDir = path.join(__dirname, 'public');
        if (fs.existsSync(publicDir)) {
            const files = fs.readdirSync(publicDir);
            console.log(`Found ${files.length} files in /public folder...`);

            files.forEach(file => {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(publicDir, file);
                        const fileData = fs.readFileSync(filePath, 'utf8');
                        gameItemsDB[file] = JSON.parse(fileData);
                        console.log(`✅ Loaded: ${file}`);
                    } catch (err) {
                        console.log(`❌ Failed to parse ${file}:`, err.message);
                    }
                }
            });
            console.log("🚀 All Items Loaded Successfully into Memory!");
        } else {
            console.log("⚠️ Public folder nahi mila! Make sure server.js ke sath 'public' folder majood ho.");
        }
    } catch (err) {
        console.log("❌ File Loading Error:", err.message);
    }
}

// Server start hotay hi files load hongi
loadLocalItems();

// ==========================================
// 🛠️ THE REAL-TIME SPOOF ENGINE
// ==========================================
const SPOOF_RULES = {
    "/ver.php": (jsonData) => {
        jsonData.is_server_open = true;
        jsonData.login_failed_count = 0;
        return jsonData;
    },
    "/get_user_info": (jsonData) => {
        if(jsonData && jsonData.data) {
            jsonData.data.equipped_bundle = defaultBundleId; 
        }
        return jsonData;
    }
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
        <title>Romeo VIP Nexus</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #050505; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 4px; }
            .log-enter { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; } }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; }
        </style>
    </head>
    <body class="bg-[#050505] text-gray-300 font-mono p-4">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center border-b border-green-900/40 pb-4 mb-6 gap-4">
                <div>
                    <h1 class="text-3xl font-black text-green-500 tracking-tighter italic">ROMEO_VIP<span class="text-white">.NEXUS</span></h1>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Target: Free Fire Official API</p>
                </div>
                <div class="flex gap-3 items-center">
                    <button onclick="clearLogs()" class="px-4 py-2 bg-red-900/20 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition text-xs font-bold rounded">CLEAR TRAFFIC</button>
                    <div class="px-4 py-2 bg-green-900/20 text-green-400 border border-green-500/50 text-xs font-bold rounded flex items-center gap-2">
                        <div class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div> LIVE CAPTURE
                    </div>
                </div>
            </header>
            <div id="logs-container" class="space-y-6"></div>
        </div>
        <script>
            const STORAGE_KEY = 'romeo_vip_logs_v6';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyData(btn, safeEncodedData) {
                const rawData = decodeURIComponent(safeEncodedData);
                navigator.clipboard.writeText(rawData).then(() => {
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = 'COPIED!';
                    btn.classList.add('bg-green-600', 'text-white');
                    setTimeout(() => {
                        btn.innerHTML = originalHTML;
                        btn.classList.remove('bg-green-600', 'text-white');
                    }, 1500);
                });
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
                    const spoofed = log.is_spoofed ? '<span class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-black border border-red-400 animate-pulse ml-3 shadow-[0_0_10px_rgba(220,38,38,0.8)]">VIP SPOOFED</span>' : '';
                    const safeData = encodeURIComponent(JSON.stringify(log, null, 2));
                    
                    html += \`
                    <div class="bg-[#0a0a0a] border \${log.is_spoofed ? 'border-red-900/50' : 'border-gray-800'} rounded-xl p-4 log-enter hover:border-gray-600 transition-colors shadow-lg">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-900 pb-3 gap-2">
                            <div class="flex items-center gap-3">
                                <span class="text-green-400 font-black text-lg bg-gray-900 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-gray-200 font-bold">\${log.path}</span>
                                \${spoofed}
                            </div>
                            <div class="flex items-center gap-4">
                                <span class="text-gray-500 text-xs font-bold">\${log.duration}</span>
                                <span class="text-green-500 text-sm font-black bg-gray-900 px-2 py-1 rounded">\${log.status}</span>
                                <button onclick="copyData(this, '\${safeData}')" class="text-xs font-bold text-green-500 border border-green-500 hover:bg-green-500 hover:text-white px-3 py-1 rounded transition-colors">COPY ALL</button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-3 left-3 bg-blue-900 text-blue-300 text-[9px] font-black px-2 py-0.5 rounded uppercase border border-blue-700">APP REQUEST PAYLOAD</div>
                                <pre class="p-3 bg-black/60 border border-gray-900 rounded-lg text-gray-400 mt-1">\${log.req}</pre>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-3 left-3 \${log.is_spoofed ? 'bg-red-900 text-red-300 border-red-700' : 'bg-green-900 text-green-300 border-green-700'} text-[9px] font-black px-2 py-0.5 rounded uppercase border">SERVER RESPONSE PAYLOAD</div>
                                <pre class="p-3 bg-black/60 border \${log.is_spoofed ? 'border-red-900/30' : 'border-gray-900'} rounded-lg text-gray-400 mt-1">\${log.res}</pre>
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
                        if(localLogs.length > 100) localLogs = localLogs.slice(0, 100);
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
// 2. PROXY & INJECTION LOGIC
// ==========================================
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    
    // 🌐 BARA FIX: Perfect URL formatting slash ke sath
    const baseUrl = TARGET_URL.endsWith('/') ? TARGET_URL.slice(0, -1) : TARGET_URL;
    const pathUrl = req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl;
    const targetUrl = \`\${baseUrl}\${pathUrl}\`; 

    try {
        const headers = { ...req.headers };
        delete headers.host; 
        delete headers['accept-encoding']; 

        const options = { method: req.method, headers };
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
            options.body = req.body;
        }

        const response = await fetch(targetUrl, options);
        let buffer = Buffer.from(await response.arrayBuffer());
        let isSpoofed = false;

        // 🚀 THE SPOOF TRIGGER
        const rulePath = Object.keys(SPOOF_RULES).find(p => req.path.includes(p));
        if (rulePath) {
            try {
                let json = JSON.parse(buffer.toString('utf8'));
                json = SPOOF_RULES[rulePath](json); 
                buffer = Buffer.from(JSON.stringify(json, null, 2));
                isSpoofed = true;
            } catch(e) {}
        }

        const duration = \`\${Date.now() - startTime}ms\`;

        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) { 
                res.setHeader(n, v);
            }
        });
        res.status(response.status).send(buffer);

        // LOGGING PREP
        let parsedReq = "Empty Payload";
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            const reqStr = req.body.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(reqStr)) parsedReq = "[ENCRYPTED BINARY]\\nHex: " + req.body.toString('hex').substring(0, 300) + "...";
            else { try { parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); } catch(e) { parsedReq = reqStr; } }
        }

        let parsedRes = "Empty Response";
        if (buffer.length > 0) {
            const resStr = buffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(resStr) && !isSpoofed) parsedRes = "[ENCRYPTED BINARY]\\nHex: " + buffer.toString('hex').substring(0, 300) + "...";
            else { try { parsedRes = JSON.stringify(JSON.parse(resStr), null, 2); } catch(e) { parsedRes = resStr; } }
        }

        requestLogs.unshift({
            id: Date.now() + '-' + Math.floor(Math.random() * 1000),
            method: req.method,
            path: req.originalUrl,
            duration,
            status: response.status,
            is_spoofed: isSpoofed,
            req: parsedReq,
            res: parsedRes
        });
        if (requestLogs.length > 50) requestLogs.pop();

    } catch (e) {
        if (!res.headersSent) res.status(500).send(e.message);
    }
});

module.exports = app;
