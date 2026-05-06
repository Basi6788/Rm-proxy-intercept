const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
// 🚀 Limit barha di taake bare logs na rukien aur har choti-bari request pakar mein aye
app.use(express.raw({ type: '*/*', limit: '200mb' })); 

const GARENA_API = 'https://loginbp.ggpolarbear.com';

const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

let requestLogs = [];
let MajorLoginReq, MajorLoginRes;

// ==========================================
// 🧠 1. PROTOBUF LOADER
// ==========================================
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});

// ==========================================
// 🛠️ 2. CRYPTO ENGINE
// ==========================================
function decryptRequest(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) { return null; }
}

function logTraffic(method, path, status, startTime, reqData, resData) {
    const newLog = {
        id: Date.now() + '-' + Math.floor(Math.random() * 10000),
        timestamp: new Date().toLocaleTimeString(),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    };
    requestLogs.unshift(newLog);
    // Server side par thori buffer limit barha di hai, baqi frontend DB sambhale ga
    if (requestLogs.length > 500) requestLogs.pop();
}

// ==========================================
// 🚀 3. API & DASHBOARD ROUTES
// ==========================================
app.get('/', (req, res) => {
    res.send("<h1 style='font-family:sans-serif; text-align:center; margin-top:50px; color:#333;'>Vercel Server Active 🚀<br><br><a href='/romeo/ds' style='color:#8b5cf6;'>Enter Dashboard</a></h1>");
});

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 👑 THE DASHBOARD (UPDATED WITH INDEXED_DB & GLOBAL COPY)
app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Aurora | Pro Engine</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://unpkg.com/dexie/dist/dexie.js"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap');
            body { background-color: #030008; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
            h1 { font-family: 'Orbitron', sans-serif; }
            ::-webkit-scrollbar { width: 6px; height: 6px; }
            ::-webkit-scrollbar-track { background: #000; }
            ::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
            .aurora-glow { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.5); }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 11px; line-height: 1.5; }
        </style>
    </head>
    <body class="min-h-screen p-3 sm:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#030008] to-black">
        <div class="max-w-7xl mx-auto">
            <header class="flex flex-col sm:flex-row justify-between items-center pb-4 mb-6 border-b border-purple-500/20 gap-4">
                <div class="flex items-center gap-4">
                    <button class="p-2 bg-purple-900/30 rounded-full border border-purple-500/50">
                        <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    <div>
                        <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase">KING_NEXUS</h1>
                        <p id="storage-status" class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1">Storage Syncing...</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="copyAllLogs(this)" class="px-4 py-2 bg-purple-900/30 text-purple-300 border border-purple-500/50 hover:bg-purple-600 hover:text-white transition-all text-[10px] font-black rounded-full tracking-widest aurora-glow">COPY ALL LOGS</button>
                    <button onclick="nukeEverything()" class="px-4 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-full tracking-widest">CLEAR ALL</button>
                </div>
            </header>
            <div id="logs-container" class="space-y-5"></div>
        </div>

        <script>
            // 💾 INITIALIZE INDEXED_DB (Zero Data Loss)
            const db = new Dexie("NexusAuroraDB");
            db.version(1).stores({ logs: 'id, timestamp, method, path, status, duration' });

            async function saveToServerLogs(serverLogs) {
                if(serverLogs.length === 0) return;
                // Add new logs to IndexedDB (Overwrites if ID already exists, keeping it clean)
                await db.logs.bulkPut(serverLogs);
                render();
            }

            async function nukeEverything() { 
                if(confirm("Are you sure? Ye browser DB aur server dono se logs ura dega!")) {
                    await fetch('/api/internal/clear', { method: 'POST' }); 
                    await db.logs.clear();
                    render(); 
                }
            }

            async function copyAllLogs(btn) {
                const allLogs = await db.logs.orderBy('id').reverse().toArray();
                if(allLogs.length === 0) return;
                
                const exportData = JSON.stringify(allLogs, null, 2);
                navigator.clipboard.writeText(exportData).then(() => {
                    const orig = btn.innerHTML;
                    btn.innerHTML = '✅ COPIED ' + allLogs.length + ' LOGS!';
                    btn.classList.replace('text-purple-300', 'text-white');
                    btn.classList.add('bg-green-600');
                    btn.classList.remove('bg-purple-900/30', 'aurora-glow');
                    setTimeout(() => {
                        btn.innerHTML = orig;
                        btn.classList.replace('text-white', 'text-purple-300');
                        btn.classList.remove('bg-green-600');
                        btn.classList.add('bg-purple-900/30', 'aurora-glow');
                    }, 3000);
                });
            }

            async function render() {
                // Fetch from Local IndexedDB
                const logs = await db.logs.orderBy('id').reverse().toArray();
                const container = document.getElementById('logs-container');
                document.getElementById('storage-status').innerText = \`\${logs.length} LOGS SAVED IN BROWSER DB\`;
                
                let html = '';
                logs.forEach(log => {
                    let isError = log.status >= 400;
                    let borderClass = isError ? 'border-red-500/30' : 'border-purple-500/30 aurora-glow';
                    html += \`
                    <div class="bg-black/60 backdrop-blur-md rounded-xl p-4 border \${borderClass} transition-all">
                        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-purple-300 font-bold text-xs tracking-wide">\${log.path}</span>
                                <span class="text-gray-500 text-[10px]">\${log.timestamp} | \${log.duration}</span>
                            </div>
                            <span class="\${isError ? 'text-red-400 bg-red-900/30' : 'text-emerald-400 bg-emerald-900/30'} text-xs font-black px-2 py-1 rounded">\${log.status}</span>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">REQUEST</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto custom-scroll"><pre class="text-purple-400/90">\${log.req}</pre></div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto custom-scroll"><pre class="\${isError ? 'text-red-400/80' : 'text-gray-400/80'}">\${log.res}</pre></div>
                            </div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html;
            }

            // 🚀 FAST BACKGROUND FETCH
            setInterval(async () => {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    saveToServerLogs(serverLogs);
                } catch(e) {}
            }, 1000); // Har 1 second baad sync
            
            render(); // Initial load
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 🌌 4. CATCH-ALL PROXY INTERCEPTOR (REAL TRAFFIC ONLY)
// ==========================================
app.all('*', async (req, res) => {
    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[EMPTY OR RAW BINARY]";
    let parsedResLog = "[EMPTY OR RAW BINARY]";

    // --- INTERCEPT & PARSE REQUEST ---
    if (reqBuffer.length > 0) {
        if (req.path.includes('MajorLogin')) {
            const decryptedReq = decryptRequest(reqBuffer);
            if (decryptedReq && MajorLoginReq) {
                try {
                    const msg = MajorLoginReq.decode(decryptedReq);
                    const jsonReq = MajorLoginReq.toObject(msg, { defaults: true, bytes: String });
                    parsedReqLog = JSON.stringify(jsonReq, null, 2);
                } catch(e) { parsedReqLog = "[REQ PROTO DECODE ERROR] " + e.message; }
            } else {
                parsedReqLog = "[DECRYPTION FAILED] AES Keys did not match.";
            }
        } else {
            // Agar MajorLogin nahi hai toh raw string save karo (har chota log pakarne k lye)
            let tryString = reqBuffer.toString('utf8');
            parsedReqLog = tryString.length > 5 ? tryString.slice(0, 2000) : \`[RAW BINARY] Size: \${reqBuffer.length} bytes\`;
        }
    } else if (Object.keys(req.query).length > 0) {
        parsedReqLog = JSON.stringify(req.query, null, 2);
    }

    // --- FORWARD TO REAL GARENA SERVER (NO MOCKS) ---
    try {
        let pathUrl = req.originalUrl.replace(/^\//, ''); 
        const targetUrl = `${GARENA_API}/${pathUrl}`;

        const headers = { ...req.headers };
        delete headers.host;
        delete headers['accept-encoding']; 
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: (req.method !== 'GET' && req.method !== 'HEAD' && reqBuffer.length > 0) ? reqBuffer : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());

        // --- INTERCEPT & PARSE RESPONSE ---
        if (resBuffer.length > 0) {
            if (req.path.includes('MajorLogin')) {
                if (MajorLoginRes) {
                    try {
                        const msgRes = MajorLoginRes.decode(resBuffer);
                        const jsonRes = MajorLoginRes.toObject(msgRes, { defaults: true, bytes: String });
                        parsedResLog = JSON.stringify(jsonRes, null, 2);
                    } catch(e) { parsedResLog = "[RES PROTO DECODE ERROR] " + e.message; }
                } else {
                    parsedResLog = "[RES DECODE FAILED] Proto missing.";
                }
            } else {
                // Try parsing JSON if normal api call, otherwise save raw text/binary info
                try {
                    parsedResLog = JSON.stringify(JSON.parse(resBuffer.toString('utf8')), null, 2);
                } catch {
                    let text = resBuffer.toString('utf8');
                    parsedResLog = text.length > 5 && text.length < 5000 ? text : \`[RAW BINARY] Size: \${resBuffer.length} bytes\`;
                }
            }
        }

        // Send actual response back to the game client
        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        res.status(response.status).send(resBuffer);
        
        logTraffic(req.method, req.originalUrl, response.status, startTime, parsedReqLog, parsedResLog);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("GATEWAY ERROR");
        logTraffic(req.method, req.originalUrl, 502, startTime, parsedReqLog, "[API ERROR OR SERVER DOWN] " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
