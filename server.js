const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Game data ko safe rakhne ke liye RAW buffer
app.use(express.raw({ type: '*/*', limit: '50mb' }));

const TARGET_URL = 'https://version.astutech.online'; 

// Server ki temporary memory
let requestLogs = []; 

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
        <title>Local Data Monitor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #111; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
            .log-enter { animation: fadeIn 0.3s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    <body class="bg-[#0a0a0a] text-gray-300 font-mono min-h-screen p-4 sm:p-8">
        <div class="max-w-6xl mx-auto">
            <header class="flex justify-between items-center border-b border-green-900/50 pb-4 mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-green-500 tracking-wider">PROXY<span class="text-white">_LOCAL_SYNC</span></h1>
                    <p class="text-xs text-gray-500 mt-1">Target: <span class="text-green-400">${TARGET_URL}/</span></p>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="clearLocalLogs()" class="text-xs text-red-500 border border-red-500/50 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Clear Data
                    </button>
                    <div class="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/30 rounded-full">
                        <div id="status-dot" class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span id="connection-status" class="text-xs text-green-400 font-semibold tracking-wide">SYNCING BROWSER</span>
                    </div>
                </div>
            </header>

            <div id="logs-container" class="space-y-4">
                </div>
        </div>

        <script>
            // BROWSER LOCAL STORAGE SETUP
            const STORAGE_KEY = 'proxy_game_logs';
            let localLogs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

            function copyToClipboard(button, dataStr) {
                navigator.clipboard.writeText(dataStr).then(() => {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
                    button.classList.replace('text-green-500', 'text-white');
                    button.classList.replace('border-green-500/50', 'border-green-400');
                    button.classList.replace('bg-transparent', 'bg-green-600');
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.replace('text-white', 'text-green-500');
                        button.classList.replace('border-green-400', 'border-green-500/50');
                        button.classList.replace('bg-green-600', 'bg-transparent');
                    }, 2000);
                });
            }

            function clearLocalLogs() {
                if(confirm('Are you sure you want to delete all captured browser logs?')) {
                    localStorage.removeItem(STORAGE_KEY);
                    localLogs = [];
                    renderAllLogs(localLogs);
                }
            }

            function renderAllLogs(logs) {
                const container = document.getElementById('logs-container');
                if (logs.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-600 mt-10">Waiting for game requests to capture...</div>';
                    return;
                }

                let html = '';
                logs.forEach(log => {
                    const methodColor = log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : 'text-yellow-400';
                    const statusColor = log.status < 400 ? 'text-green-500' : 'text-red-500';
                    const encodedData = JSON.stringify(log, null, 2).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\n/g, '\\\\n');

                    html += \`
                        <div class="bg-[#111] border border-gray-800 rounded-lg overflow-hidden log-enter transition-all hover:border-green-900/50">
                            <div class="flex justify-between items-center bg-[#1a1a1a] px-4 py-2 border-b border-gray-800">
                                <div class="flex items-center gap-3">
                                    <span class="font-bold \${methodColor} text-sm">\${log.method}</span>
                                    <span class="text-gray-300 text-sm truncate max-w-xs sm:max-w-md">\${log.path}</span>
                                </div>
                                <div class="flex items-center gap-4">
                                    <span class="text-xs text-gray-500">\${log.duration}</span>
                                    <span class="text-xs font-bold \${statusColor}">\${log.status}</span>
                                    <button onclick="copyToClipboard(this, '\${encodedData}')" class="flex items-center text-xs text-green-500 border border-green-500/50 hover:bg-green-500/10 px-2 py-1 rounded transition-colors cursor-pointer">
                                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        Copy All
                                    </button>
                                </div>
                            </div>
                            <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                                <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50 overflow-hidden">
                                    <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">APP REQUEST PAYLOAD</div>
                                    <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${log.request_body || 'Empty'}</pre>
                                </div>
                                <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50 overflow-hidden">
                                    <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">SERVER RESPONSE</div>
                                    <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${log.response_body || 'Empty'}</pre>
                                </div>
                            </div>
                        </div>
                    \`;
                });
                container.innerHTML = html;
            }

            // On load, purane browser logs render kar do
            renderAllLogs(localLogs);

            // API se naye logs uthana aur Browser LocalStorage me daalna
            async function syncLogs() {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    let addedNew = false;

                    // Reverse karke merge kar rahe hain takay latest top par aaye
                    serverLogs.reverse().forEach(sLog => {
                        // Check karo ke yeh log pehle se browser me hai ya nahi (ID ke zariye)
                        if (!localLogs.find(l => l.id === sLog.id)) {
                            localLogs.unshift(sLog);
                            addedNew = true;
                        }
                    });

                    if (addedNew) {
                        // Browser ki memory bhar na jaye isliye sirf latest 100 requests save rakhenge
                        if (localLogs.length > 100) localLogs = localLogs.slice(0, 100);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(localLogs));
                        renderAllLogs(localLogs);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }

            // Har 0.5 seconds me server se logs fetch kar ke browser me sync karega
            setInterval(syncLogs, 500);
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 2. INTERNAL API (Dashboard yahan se logs uthayega)
// ==========================================
app.get('/api/internal/logs', (req, res) => {
    res.json(requestLogs);
});

// ==========================================
// 3. ULTRA-FAST PROXY LOGIC (RAW BINARY SAFE)
// ==========================================
app.all('*', async (req, res) => {
    // Apne routes ko ignore karo takay loop na bane
    if (req.path === '/romeo/ds' || req.path === '/api/internal/logs' || req.path === '/favicon.ico') {
        return;
    }

    const startTime = Date.now();
    const baseUrl = TARGET_URL.endsWith('/') ? TARGET_URL.slice(0, -1) : TARGET_URL;
    const targetUrl = `${baseUrl}${req.originalUrl}`;

    try {
        const forwardHeaders = { ...req.headers };
        delete forwardHeaders.host; 
        delete forwardHeaders['content-length']; 
        delete forwardHeaders['connection']; 

        const fetchOptions = {
            method: req.method,
            headers: forwardHeaders,
        };

        // Body RAW format me aage forward ho rahi hai
        if (!['GET', 'HEAD'].includes(req.method) && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
            fetchOptions.body = req.body;
        }

        // 1. GAME KO REQUEST BHEJNA
        const response = await fetch(targetUrl, fetchOptions);
        
        // 2. BINARY RESPONSE LENA
        const resArrayBuffer = await response.arrayBuffer();
        const resBuffer = Buffer.from(resArrayBuffer);
        const durationMs = Date.now() - startTime;

        // 3. FORAN GAME KO RESPONSE WAPIS DENA
        response.headers.forEach((value, name) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) { 
                res.setHeader(name, value);
            }
        });
        res.status(response.status).send(resBuffer);

        // ==========================================
        // 4. BACKGROUND PAR LOGS SAVE KARNA (Dashboard ke liye)
        // ==========================================
        let parsedReq = "Empty / No Payload";
        if (Buffer.isBuffer(req.body) && req.body.length > 0) {
            const reqStr = req.body.toString('utf8');
            try { 
                parsedReq = JSON.stringify(JSON.parse(reqStr), null, 2); 
            } catch(e) { 
                parsedReq = reqStr; // Agar binary/string mix hai
            }
        }

        let parsedRes = "Empty Response";
        if (resBuffer.length > 0) {
            const resStr = resBuffer.toString('utf8');
            try { 
                parsedRes = JSON.stringify(JSON.parse(resStr), null, 2); 
            } catch(e) { 
                parsedRes = resStr;
            }
        }

        // Generate a unique ID for the frontend to prevent duplicates
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

        // Server sirf latest 50 logs hold karega, baqi client apne browser me utha ke save kar lega
        if (requestLogs.length > 50) requestLogs.pop();

    } catch (error) {
        const durationMs = Date.now() - startTime;
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy Request Failed', details: error.message });
        }

        const logId = Date.now().toString() + '-' + Math.floor(Math.random() * 1000);
        requestLogs.unshift({
            id: logId,
            method: req.method,
            path: req.originalUrl,
            status: 500,
            duration: `${durationMs}ms`,
            request_body: "Failed to forward request",
            response_body: `Error: ${error.message}`
        });
    }
});

module.exports = app;
