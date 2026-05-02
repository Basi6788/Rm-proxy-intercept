const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

const TARGET_URL = 'https://version.astutech.online'; 
let requestLogs = []; 

// ==========================================
// 🛠️ THE SPOOFING ENGINE (Yahan apne hacks dalne hain)
// ==========================================
const SPOOF_RULES = {
    // 1. Server Version Bypass (Example)
    "/ver.php": (jsonData) => {
        jsonData.is_server_open = true;
        jsonData.login_failed_count = 0;
        // Agar patch note url change karna ho:
        // jsonData.patchnote_url = "https://teri-website.com";
        return jsonData;
    },
    
    // 2. Inventory Spoofing (Yeh path tujhe dashboard se dhondna hoga)
    // Game jab bhi profile mangegi, proxy ye fake data de gi
    "/api/get_profile": (jsonData) => {
        // NOTE: Ye sirf example path hai. Asli path aur keys dashboard se capture kar ke yahan dalna
        if(jsonData.user) {
            jsonData.user.diamonds = 99999;
            jsonData.user.gold = 999999;
            jsonData.user.unlocked_skins = ["AK47_BlueFlame", "M1014_Green"]; // Asli IDs dalni hongi
        }
        return jsonData;
    }
};

// ==========================================
// 1. DASHBOARD UI ROUTE (/romeo/ds)
// ==========================================
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nexus Spoofer UI</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #0a0a0a; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
            .log-enter { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
    </head>
    <body class="bg-[#050505] text-gray-300 font-mono min-h-screen p-2 sm:p-6">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-green-900/50 pb-4 mb-6 gap-4">
                <div>
                    <h1 class="text-3xl font-black text-green-500 tracking-widest uppercase">SPOOF<span class="text-white">_NEXUS</span></h1>
                    <p class="text-xs text-gray-400 mt-1">Intercepting: <span class="text-green-400 underline">${TARGET_URL}/</span></p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="clearLogs()" class="text-xs font-bold text-red-500 border border-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded transition-all flex items-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        CLEAR CACHE
                    </button>
                    <div class="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-500/50 rounded shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                        <div class="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-xs text-green-400 font-bold tracking-widest uppercase">LIVE CAPTURE</span>
                    </div>
                </div>
            </header>

            <div id="logs-container" class="space-y-6 pb-20">
                <div class="text-center text-gray-600 mt-20 font-bold tracking-widest">AWAITING GAME TRAFFIC...</div>
            </div>
        </div>

        <script>
            const STORAGE_KEY = 'proxy_game_logs_v3';
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
                if(confirm('Wipe all logs?')) {
                    localStorage.removeItem(STORAGE_KEY);
                    localLogs = [];
                    document.getElementById('logs-container').innerHTML = '<div class="text-center text-gray-600 mt-20 font-bold tracking-widest">CLEARED. AWAITING TRAFFIC...</div>';
                    try { await fetch('/api/internal/clear', { method: 'POST' }); } catch(e) {}
                }
            }

            function renderAllLogs(logs) {
                const container = document.getElementById('logs-container');
                if (logs.length === 0) return;

                let html = '';
                logs.forEach(log => {
                    const methodColor = log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : 'text-yellow-400';
                    const statusColor = log.status < 400 ? 'text-green-500' : 'text-red-500';
                    const safeData = encodeURIComponent(JSON.stringify(log, null, 2));

                    // Agar response manipulate hua hai to alag tag lagao
                    const isSpoofed = log.response_body.includes("SPOOFED_BY_PROXY") ? 
                        '<span class="bg-red-900 text-red-200 text-xs px-2 py-0.5 ml-2 rounded font-black border border-red-500 animate-pulse">MODIFIED</span>' : '';

                    html += \`
                        <div class="bg-[#0a0a0a] border \${isSpoofed ? 'border-red-900/50' : 'border-gray-800'} rounded-xl overflow-hidden log-enter transition-all hover:border-gray-600 shadow-lg">
                            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#111] px-5 py-3 border-b border-gray-800 gap-3">
                                <div class="flex items-center gap-4 w-full sm:w-auto">
                                    <span class="font-black \${methodColor} text-lg bg-gray-900 px-2 py-1 rounded">\${log.method}</span>
                                    <span class="text-gray-300 text-sm font-semibold truncate w-full sm:w-auto max-w-[200px] sm:max-w-md" title="\${log.path}">\${log.path}</span>
                                    \${isSpoofed}
                                </div>
                                <div class="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end">
                                    <span class="text-xs text-gray-500 font-bold">\${log.duration}</span>
                                    <span class="text-sm font-black \${statusColor} bg-gray-900 px-2 py-1 rounded">\${log.status}</span>
                                    <button onclick="copyData(this, '\${safeData}')" class="flex items-center text-xs font-bold text-green-500 border border-green-500 hover:bg-green-500 hover:text-white px-3 py-1.5 rounded transition-colors cursor-pointer">
                                        COPY ALL
                                    </button>
                                </div>
                            </div>

                            <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div class="bg-[#050505] p-4 rounded-lg border border-blue-900/30 relative">
                                    <div class="absolute -top-3 left-4 bg-blue-900 text-blue-300 text-[10px] font-black px-2 py-1 rounded uppercase border border-blue-700">🎮 APP REQUEST</div>
                                    <pre class="mt-2 text-gray-400 text-xs">\${log.request_body}</pre>
                                </div>

                                <div class="bg-[#050505] p-4 rounded-lg border \${isSpoofed ? 'border-red-900/50' : 'border-green-900/30'} relative">
                                    <div class="absolute -top-3 left-4 \${isSpoofed ? 'bg-red-900 text-red-300 border-red-700' : 'bg-green-900 text-green-300 border-green-700'} text-[10px] font-black px-2 py-1 rounded uppercase border">
                                        🌐 SERVER RESPONSE
                                    </div>
                                    <pre class="mt-2 text-gray-400 text-xs">\${log.response_body}</pre>
                                </div>
                            </div>
                        </div>
                    \`;
                });
                container.innerHTML = html;
            }

            renderAllLogs(localLogs);

            async function syncLogs() {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    let addedNew = false;

                    serverLogs.reverse().forEach(sLog => {
                        if (!localLogs.find(l => l.id === sLog.id)) {
                            localLogs.unshift(sLog);
                            addedNew = true;
                        }
                    });

                    if (addedNew) {
                        if (localLogs.length > 200) localLogs = localLogs.slice(0, 200);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(localLogs));
                        renderAllLogs(localLogs);
                    }
                } catch (err) {}
            }

            setInterval(syncLogs, 500);
        </script>
    </body>
    </html>
    `);
});

// INTERNAL API
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

// ==========================================
// 2. MAIN PROXY & INTERCEPTION LOGIC
// ==========================================
app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    const baseUrl = TARGET_URL.endsWith('/') ? TARGET_URL.slice(0, -1) : TARGET_URL;
    const targetUrl = `${baseUrl}${req.originalUrl}`; 

    try {
        const forwardHeaders = { ...req.headers };
        delete forwardHeaders.host; 
        delete forwardHeaders['content-length']; 
        delete forwardHeaders['connection']; 
        delete forwardHeaders['accept-encoding']; 

        const fetchOptions = { method: req.method, headers: forwardHeaders };
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
            fetchOptions.body = req.body;
        }

        const response = await fetch(targetUrl, fetchOptions);
        let resBuffer = Buffer.from(await response.arrayBuffer());
        let isManipulated = false;

        // ========================================================
        // 🚀 SMART INJECTION TRIGGER
        // ========================================================
        // Yahan check karta hai ke kya req.path SPOOF_RULES me defined hai?
        const matchedRulePath = Object.keys(SPOOF_RULES).find(rulePath => req.path.includes(rulePath));
        
        if (matchedRulePath) {
            try {
                let originalText = resBuffer.toString('utf8');
                let jsonObj = JSON.parse(originalText);
                
                // Rule function ko call kar ke data modify karo
                let modifiedJson = SPOOF_RULES[matchedRulePath](jsonObj);
                
                // Dashboard ko batane ke liye hidden flag
                modifiedJson["SPOOFED_BY_PROXY"] = true;
                
                // Wapis Buffer me pack kar do
                resBuffer = Buffer.from(JSON.stringify(modifiedJson, null, 2));
                isManipulated = true;
            } catch (err) {
                // Agar data JSON nahi hai ya encrypted hai toh skip kar dega
            }
        }
        // ========================================================

        const durationMs = Date.now() - startTime;

        response.headers.forEach((value, name) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) { 
                res.setHeader(name, value);
            }
        });
        
        res.status(response.status).send(resBuffer);

        // UI Parsing Logic
        let parsedReq = "Empty Payload (GET/OPTIONS Request)";
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            const reqStr = req.body.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(reqStr)) parsedReq = "[ENCRYPTED BINARY]\nHex: " + req.body.toString('hex').substring(0, 500) + "...";
            else { try { parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); } catch(e) { parsedReq = reqStr; } }
        }

        let parsedRes = "Empty Response / No Body";
        if (resBuffer.length > 0) {
            const resStr = resBuffer.toString('utf8');
            if (/[\x00-\x08\x0E-\x1F]/.test(resStr) && !isManipulated) {
                parsedRes = "[ENCRYPTED BINARY]\nHex: " + resBuffer.toString('hex').substring(0, 500) + "...";
            } else {
                try { parsedRes = JSON.stringify(JSON.parse(resStr), null, 2); } catch(e) { parsedRes = resStr; }
            }
        }

        const logId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
        requestLogs.unshift({
            id: logId,
            method: req.method,
            path: req.originalUrl,
            status: response.status,
            duration: `${durationMs}ms`,
            request_body: parsedReq,
            response_body: parsedRes
        });

        if (requestLogs.length > 100) requestLogs.pop();

    } catch (error) {
        const durationMs = Date.now() - startTime;
        if (!res.headersSent) res.status(500).json({ error: 'Proxy Request Failed', details: error.message });

        requestLogs.unshift({
            id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
            method: req.method,
            path: req.originalUrl,
            status: 500,
            duration: `${durationMs}ms`,
            request_body: "Request dropped",
            response_body: `System Error: ${error.message}`
        });
    }
});

module.exports = app;
