const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Body parser limits badha di hain takay bare payloads bhi easily process hon
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const TARGET_URL = 'https://version.astutech.online/';

// In-memory array logs store karne ke liye
let requestLogs = []; 

// Dashboard Route
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Proxy Monitor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            /* Custom Scrollbar for a sleek look */
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #111; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
            .log-enter { animation: fadeIn 0.2s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    <body class="bg-[#0a0a0a] text-gray-300 font-mono min-h-screen p-4 sm:p-8">
        <div class="max-w-6xl mx-auto">
            <header class="flex justify-between items-center border-b border-green-900/50 pb-4 mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-green-500 tracking-wider">PROXY<span class="text-white">_MONITOR</span></h1>
                    <p class="text-xs text-gray-500 mt-1">Target: <span class="text-green-400">${TARGET_URL}</span></p>
                </div>
                <div class="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/30 rounded-full">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-xs text-green-400 font-semibold tracking-wide">DASHBOARD SYNC: 100ms</span>
                </div>
            </header>

            <div id="logs-container" class="space-y-4">
                <div class="text-center text-gray-600 mt-10">Waiting for requests...</div>
            </div>
        </div>

        <script>
            let lastLogCount = 0;

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

            async function fetchLogs() {
                try {
                    const res = await fetch('/api/internal/logs');
                    const logs = await res.json();
                    
                    if (logs.length !== lastLogCount) {
                        const container = document.getElementById('logs-container');
                        if (lastLogCount === 0) container.innerHTML = ''; // Clear waiting text
                        
                        let html = '';
                        logs.forEach(log => {
                            const methodColor = log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : 'text-yellow-400';
                            const statusColor = log.status < 400 ? 'text-green-500' : 'text-red-500';
                            const rawData = JSON.stringify(log, null, 2);
                            // JSON stringify me naye lines aur quotes ko safe karna takay copy button na phate
                            const encodedData = rawData.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\n/g, '\\\\n');

                            html += \`
                            <div class="bg-[#111] border border-gray-800 rounded-lg overflow-hidden log-enter transition-all hover:border-green-900/50">
                                <div class="flex justify-between items-center bg-[#1a1a1a] px-4 py-2 border-b border-gray-800">
                                    <div class="flex items-center gap-3">
                                        <span class="font-bold \${methodColor} text-sm">\${log.method}</span>
                                        <span class="text-gray-300 text-sm truncate max-w-xs sm:max-w-md">\${log.path}</span>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <span class="text-xs text-gray-500">Ping: \${log.duration}</span>
                                        <span class="text-xs font-bold \${statusColor}">\${log.status}</span>
                                        <button onclick="copyToClipboard(this, '\${encodedData}')" class="flex items-center text-xs text-green-500 border border-green-500/50 hover:bg-green-500/10 px-2 py-1 rounded transition-colors cursor-pointer">
                                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                            Copy All
                                        </button>
                                    </div>
                                </div>
                                <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                                    <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50">
                                        <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">APP REQUEST PAYLOAD</div>
                                        <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${JSON.stringify(log.requestBody, null, 2) || '{}'}</pre>
                                    </div>
                                    <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50">
                                        <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">SERVER RESPONSE</div>
                                        <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${JSON.stringify(log.responseBody, null, 2) || '{}'}</pre>
                                    </div>
                                </div>
                            </div>
                            \`;
                        });
                        container.innerHTML = html;
                        lastLogCount = logs.length;
                    }
                } catch (err) {}
            }

            // Dashboard 100ms par update hoga
            setInterval(fetchLogs, 100);
            fetchLogs();
        </script>
    </body>
    </html>
    `);
});

// Logs API endpoint (Dashboard isko poll karta hai)
app.get('/api/internal/logs', (req, res) => {
    res.json(requestLogs);
});

// Proxy Logic: Har route ko intercept karke target par bhejta hai
app.all('*', async (req, res) => {
    // Apne internal routes ignore karo
    if (req.path === '/' || req.path === '/favicon.ico' || req.path === '/api/internal/logs') return;

    const startTime = Date.now();
    const targetUrl = `${TARGET_URL}${req.originalUrl}`;

    try {
        // Headers forward karne ki tyari
        const forwardHeaders = { ...req.headers };
        delete forwardHeaders.host; 
        delete forwardHeaders['content-length']; 
        delete forwardHeaders['connection']; // FIX: Vercel Express crash se bachane ke liye

        const fetchOptions = {
            method: req.method,
            headers: forwardHeaders,
        };

        // Agar method GET ya HEAD nahi hai, toh body sath bhejo
        if (!['GET', 'HEAD'].includes(req.method)) {
            fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
        }

        // Target URL par exact request bhejna
        const response = await fetch(targetUrl, fetchOptions);
        
        // Response ko text me nikalna
        const responseText = await response.text();
        
        let parsedResponse = responseText;
        try { parsedResponse = JSON.parse(responseText); } catch(e) {} 

        const durationMs = Date.now() - startTime;

        // Log save karna dashboard ke liye
        requestLogs.unshift({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            status: response.status,
            duration: `${durationMs}ms`,
            requestBody: req.body,
            responseBody: parsedResponse
        });

        // Memory overload se bachne ke liye sirf latest 50 logs rakho
        if (requestLogs.length > 50) requestLogs.pop();

        // Response wapis app ko bhejna
        response.headers.forEach((value, name) => {
            if (name.toLowerCase() !== 'content-encoding') { // FIX: Browser data read error se bachane ke liye
                res.setHeader(name, value);
            }
        });
        res.status(response.status).send(responseText);

    } catch (error) {
        const durationMs = Date.now() - startTime;
        
        requestLogs.unshift({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            status: 500,
            duration: `${durationMs}ms`,
            requestBody: req.body,
            responseBody: { error: "Proxy Error", details: error.message }
        });

        res.status(500).json({ error: 'Proxy failed to forward request', details: error.message });
    }
});

module.exports = app;
