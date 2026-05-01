// In-memory array logs store karne ke liye
let requestLogs = []; 
const TARGET_URL = 'https://version.astutech.online';

module.exports = async (req, res) => {
    // ==========================================
    // 1. CORS & PREFLIGHT (Game ko connect karne ke liye)
    // ==========================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    const urlPath = req.url;

    // ==========================================
    // 2. DASHBOARD UI ROUTE (Visualizer)
    // ==========================================
    if (urlPath === '/' || urlPath === '') {
        res.setHeader('Content-Type', 'text/html');
        return res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Game Proxy Monitor</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
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
                    <div class="text-center text-gray-600 mt-10">Waiting for game requests...</div>
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
                            if (lastLogCount === 0) container.innerHTML = ''; 
                            
                            let html = '';
                            logs.forEach(log => {
                                const methodColor = log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : 'text-yellow-400';
                                const statusColor = log.status < 400 ? 'text-green-500' : 'text-red-500';
                                const rawData = JSON.stringify(log, null, 2);
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
                                        <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50 overflow-hidden">
                                            <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">APP REQUEST PAYLOAD</div>
                                            <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${JSON.stringify(log.requestBody, null, 2) || 'Empty'}</pre>
                                        </div>
                                        <div class="bg-[#0a0a0a] p-3 rounded border border-gray-800/50 overflow-hidden">
                                            <div class="text-green-500 mb-2 font-bold opacity-70 border-b border-gray-800 pb-1">SERVER RESPONSE</div>
                                            <pre class="overflow-x-auto text-gray-400 whitespace-pre-wrap">\${JSON.stringify(log.responseBody, null, 2) || 'Empty'}</pre>
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

                // UI 100ms me refresh hoga
                setInterval(fetchLogs, 100);
                fetchLogs();
            </script>
        </body>
        </html>
        `);
    }

    // ==========================================
    // 3. INTERNAL API ROUTE (Logs fetch karne ke liye)
    // ==========================================
    if (urlPath === '/api/internal/logs') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify(requestLogs));
    }

    if (urlPath.includes('/favicon.ico')) {
        res.statusCode = 204;
        return res.end();
    }

    // ==========================================
    // 4. ULTRA-FAST PROXY LOGIC (2ms OVERHEAD)
    // ==========================================
    const startTime = Date.now();
    const targetFullUrl = `${TARGET_URL}${urlPath}`;

    try {
        // Raw Request Body padhna (Streams buffer ke zariye takay max speed milay)
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const reqBodyBuffer = Buffer.concat(chunks);

        // Bypass karne ke liye Headers adjust karna
        const forwardHeaders = { ...req.headers };
        delete forwardHeaders.host; 
        delete forwardHeaders['content-length']; 
        delete forwardHeaders['connection']; 

        const fetchOptions = {
            method: req.method,
            headers: forwardHeaders,
        };

        if (!['GET', 'HEAD'].includes(req.method) && reqBodyBuffer.length > 0) {
            fetchOptions.body = reqBodyBuffer;
        }

        // Target ko request lagana
        const response = await fetch(targetFullUrl, fetchOptions);
        
        // Response ko binary buffer me read karna (kyunke game response kuch bhi ho sakta hai)
        const resArrayBuffer = await response.arrayBuffer();
        const resBuffer = Buffer.from(resArrayBuffer);

        // Ping calculate karna (Kitna time laga aage se wapis aane me)
        const durationMs = Date.now() - startTime; 

        // Headers Foran Wapis Bhejna
        response.headers.forEach((value, name) => {
            if (name.toLowerCase() !== 'content-encoding') { 
                res.setHeader(name, value);
            }
        });

        // App/Game ko bina kisi rukawat response wapis Dena!
        res.statusCode = response.status;
        res.end(resBuffer);

        // ==========================================
        // 5. BACKGROUND LOGGING (Iska game ping par koi asar nahi)
        // ==========================================
        let reqBodyParsed = reqBodyBuffer.toString('utf8');
        let resBodyParsed = resBuffer.toString('utf8');

        // JSON try karna
        try { reqBodyParsed = JSON.parse(reqBodyParsed); } catch(e) {}
        try { resBodyParsed = JSON.parse(resBodyParsed); } catch(e) {}

        requestLogs.unshift({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: urlPath,
            status: response.status,
            duration: `${durationMs}ms`, 
            requestBody: reqBodyParsed || reqBodyBuffer.toString('base64'), 
            responseBody: resBodyParsed || resBuffer.toString('base64')
        });

        // Server memory bachane ke liye sirf last 50 requests store karni hain
        if (requestLogs.length > 50) requestLogs.pop();

    } catch (error) {
        const durationMs = Date.now() - startTime;
        
        requestLogs.unshift({
            timestamp: new Date().toISOString(),
            method: req.method,
            path: urlPath,
            status: 500,
            duration: `${durationMs}ms`,
            requestBody: "Failed to read",
            responseBody: { error: "Proxy Error", details: error.message }
        });

        // Agar response pehle hi send nahi hua tabhi error bhejna
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Proxy Request Failed', details: error.message }));
        }
    }
};
