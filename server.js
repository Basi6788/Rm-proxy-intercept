const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// SAB SE BARA FIX: Express ab kisi data ko corrupt nahi karega. 
// Har cheez RAW Buffer (binary) me receive hogi.
app.use(express.raw({ type: '*/*', limit: '50mb' }));

const TARGET_URL = 'https://version.astutech.online'; 
const SUPABASE_URL = 'https://nebwfonyhfgxnfkiisvs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lYndmb255aGZneG5ma2lpc3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNjc0MjMsImV4cCI6MjA5MDk0MzQyM30.me-P_mhC3droVGrHSlD_G3h9-ZgGgR3hy8VyDLFTp58';

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
        <title>Supabase Realtime Monitor</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
        <style>
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #111; }
            ::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #16a34a; }
            .log-enter { animation: fadeIn 0.4s ease-out; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        </style>
    </head>
    <body class="bg-[#0a0a0a] text-gray-300 font-mono min-h-screen p-4 sm:p-8">
        <div class="max-w-6xl mx-auto">
            <header class="flex justify-between items-center border-b border-green-900/50 pb-4 mb-6">
                <div>
                    <h1 class="text-2xl font-bold text-green-500 tracking-wider">PROXY<span class="text-white">_SUPABASE</span></h1>
                    <p class="text-xs text-gray-500 mt-1">Target: <span class="text-green-400">${TARGET_URL}/</span></p>
                </div>
                <div class="flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-500/30 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    <div id="status-dot" class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span id="connection-status" class="text-xs text-yellow-400 font-semibold tracking-wide">CONNECTING...</span>
                </div>
            </header>

            <div id="logs-container" class="space-y-4">
                <div id="waiting-text" class="text-center text-gray-600 mt-10">Fetching logs from Supabase...</div>
            </div>
        </div>

        <script>
            const supabaseUrl = '${SUPABASE_URL}';
            const supabaseKey = '${SUPABASE_KEY}';
            const supabase = supabase.createClient(supabaseUrl, supabaseKey);

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

            function renderLog(log) {
                const container = document.getElementById('logs-container');
                const waitingText = document.getElementById('waiting-text');
                if (waitingText) waitingText.remove();

                const methodColor = log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-green-400' : 'text-yellow-400';
                const statusColor = log.status < 400 ? 'text-green-500' : 'text-red-500';
                
                // Safe JSON encode for button
                const rawData = JSON.stringify(log, null, 2);
                const encodedData = rawData.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\n/g, '\\\\n');

                const logEl = document.createElement('div');
                logEl.className = 'bg-[#111] border border-gray-800 rounded-lg overflow-hidden log-enter transition-all hover:border-green-900/50';
                logEl.innerHTML = \`
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
                \`;
                container.prepend(logEl);
            }

            async function fetchExistingLogs() {
                try {
                    const { data, error } = await supabase
                        .from('logs')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(50);
                    
                    if (error) throw error;

                    if (data && data.length > 0) {
                        [...data].reverse().forEach(log => renderLog(log));
                    } else if (!data || data.length === 0) {
                        document.getElementById('waiting-text').innerText = "Waiting for new game requests...";
                    }
                    
                    document.getElementById('connection-status').innerText = "REALTIME SYNC ON";
                    document.getElementById('connection-status').classList.replace('text-yellow-400', 'text-green-400');
                    document.getElementById('status-dot').classList.replace('bg-yellow-500', 'bg-green-500');

                } catch (err) {
                    console.error(err);
                    document.getElementById('connection-status').innerText = "DB ERROR";
                    document.getElementById('connection-status').classList.replace('text-yellow-400', 'text-red-500');
                    document.getElementById('status-dot').classList.replace('bg-yellow-500', 'bg-red-500');
                    
                    document.getElementById('waiting-text').innerHTML = \`
                        <span class="text-red-500 font-bold">Supabase Connection Failed!</span><br><br>
                        \${err.message}<br><br>
                        Check if table 'logs' is created and RLS is disabled in Supabase.
                    \`;
                }
            }

            // Realtime WebSocket Subscription
            supabase.channel('public:logs')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, payload => {
                    renderLog(payload.new);
                })
                .subscribe();

            fetchExistingLogs();
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 2. ULTRA-FAST PROXY LOGIC (RAW BINARY SAFE)
// ==========================================
app.all('*', async (req, res) => {
    // Ignore internal favicon requests
    if (req.path === '/favicon.ico') return res.status(204).end();

    const startTime = Date.now();
    
    // Ensure URL is perfectly mapped
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

        // Agar body hai toh as a raw Buffer forward karega
        if (!['GET', 'HEAD'].includes(req.method) && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
            fetchOptions.body = req.body;
        }

        // 1. GAME KO REQUEST BHEJNA
        const response = await fetch(targetUrl, fetchOptions);
        
        // GAME CRASH FIX: Response ko text ki jagah ArrayBuffer (Binary) me lena zaroori hai
        const resArrayBuffer = await response.arrayBuffer();
        const resBuffer = Buffer.from(resArrayBuffer);
        const durationMs = Date.now() - startTime;

        // 2. FORAN RESPONSE WAPIS Dena (Headers copy karke)
        response.headers.forEach((value, name) => {
            // Compression encoding bypass kardo takay buffer sahi read ho game me
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(name.toLowerCase())) { 
                res.setHeader(name, value);
            }
        });
        
        // Exact binary buffer response send karna
        res.status(response.status).send(resBuffer);

        // 3. BACKGROUND ME SUPABASE PAR SAVE (Proxy latency = 0ms)
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

        // Supabase REST insert (Silent)
        fetch(`${SUPABASE_URL}/rest/v1/logs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                method: req.method,
                path: req.originalUrl,
                status: response.status,
                duration: `${durationMs}ms`,
                request_body: parsedReq,
                response_body: parsedRes
            })
        }).catch(err => console.error("Supabase Save Error:", err));

    } catch (error) {
        const durationMs = Date.now() - startTime;
        
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy Request Failed', details: error.message });
        }

        fetch(`${SUPABASE_URL}/rest/v1/logs`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: req.method,
                path: req.originalUrl,
                status: 500,
                duration: `${durationMs}ms`,
                request_body: "Failed to forward request",
                response_body: `Error: ${error.message}`
            })
        }).catch(e => console.log(e));
    }
});

module.exports = app;
