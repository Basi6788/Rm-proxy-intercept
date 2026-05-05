const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
// Garena ke binary packets pakarne ke liye raw buffer parser
app.use(express.raw({ type: '*/*', limit: '100mb' })); 

// 🚀 TARGET GARENA API (From your script)
const GARENA_API = 'https://loginbp.ggpolarbear.com';

// 🔑 GARENA AES-128-CBC KEYS
// Tera python AES encryption use kar raha tha isi key/iv ke sath
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8'); // 16 bytes
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8'); // 16 bytes
const ALGO = 'aes-128-cbc';

let requestLogs = [];
let MajorLoginReq, MajorLoginRes;

// ==========================================
// 🧠 PROTOBUF LOADER
// ==========================================
protobuf.load("MajorLoginReq.proto").then(root => {
    MajorLoginReq = root.lookupType("MajorLogin");
    console.log("✅ Request Proto Loaded");
}).catch(() => console.log("⚠️ MajorLoginReq.proto not found!"));

protobuf.load("MajorLoginRes.proto").then(root => {
    MajorLoginRes = root.lookupType("MajorLoginRes");
    console.log("✅ Response Proto Loaded");
}).catch(() => console.log("⚠️ MajorLoginRes.proto not found!"));

// ==========================================
// 🛡️ CRYPTO ENGINE (Python Logic Ported to Node.js)
// ==========================================
function decryptData(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        // Node.js handles PKCS7 padding automatically by default!
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) {
        return null; // Key mismatch ya corrupt data
    }
}

function encryptData(buffer) {
    try {
        const cipher = crypto.createCipheriv(ALGO, AES_KEY, AES_IV);
        // Node.js handles PKCS7 padding automatically by default!
        return Buffer.concat([cipher.update(buffer), cipher.final()]);
    } catch (e) {
        return null;
    }
}

// ==========================================
// 🚀 MASTER MITM INTERCEPTOR
// ==========================================
app.all('*', async (req, res) => {
    // Ignore internal dashboard routes
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    
    let dashboardReq = "Raw Binary";
    let dashboardRes = "Waiting for response...";
    let finalReqBuffer = reqBuffer; // Default to raw if decryption fails

    // 🔥 1. INTERCEPT & DECRYPT INCOMING REQUEST FROM GAME
    if (reqBuffer.length > 0) {
        const decryptedReq = decryptData(reqBuffer);
        if (decryptedReq && req.path.includes('MajorLogin') && MajorLoginReq) {
            try {
                // Decode Protobuf to JSON
                const decodedMsg = MajorLoginReq.decode(decryptedReq);
                const jsonReq = MajorLoginReq.toObject(decodedMsg, { defaults: true, bytes: String });
                dashboardReq = JSON.stringify(jsonReq, null, 2);

                // 💉 HACKING ZONE (Request Modding)
                // Yahan tu game se aate hue data ko Garena tak pohanchne se pehle badal sakta hai
                // jsonReq.unique_device_id = "FAKE_DEVICE_123";

                // Re-pack to Protobuf & Encrypt
                const modifiedProto = MajorLoginReq.encode(MajorLoginReq.create(jsonReq)).finish();
                const reEncryptedReq = encryptData(modifiedProto);
                if (reEncryptedReq) finalReqBuffer = reEncryptedReq;

            } catch (e) {
                dashboardReq = `[PROTO DECODE FAIL] ${e.message}`;
            }
        } else if (decryptedReq) {
            dashboardReq = "[DECRYPTED RAW] " + decryptedReq.toString('hex').substring(0, 100) + "...";
        } else {
            dashboardReq = `[ENCRYPTED HEX] ${reqBuffer.toString('hex').substring(0, 100)}...`;
        }
    }

    // 🔥 2. FORWARD REQUEST TO GARENA
    try {
        const targetUrl = `${GARENA_API}${req.originalUrl}`;
        const headers = { ...req.headers };
        delete headers.host;             // Garena ko apni IP dikhane do
        delete headers['accept-encoding']; // Important: Gzip off kar do takay hum data parh sakein

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: finalReqBuffer.length > 0 ? finalReqBuffer : undefined
        });

        const resBuffer = Buffer.from(await response.arrayBuffer());

        // 🔥 3. INTERCEPT & DECRYPT RESPONSE FROM GARENA
        let finalResBuffer = resBuffer;

        if (resBuffer.length > 0) {
            const decryptedRes = decryptData(resBuffer);
            if (decryptedRes && req.path.includes('MajorLogin') && MajorLoginRes) {
                try {
                    // Decode Protobuf to JSON
                    const decodedResMsg = MajorLoginRes.decode(decryptedRes);
                    const jsonRes = MajorLoginRes.toObject(decodedResMsg, { defaults: true, bytes: String });
                    dashboardRes = JSON.stringify(jsonRes, null, 2);

                    // 💉 HACKING ZONE (Response Modding)
                    // Yahan tu Garena se aaye data me skins/diamonds inject kar sakta hai game ko dene se pehle!

                    // Re-pack to Protobuf & Encrypt
                    const modifiedResProto = MajorLoginRes.encode(MajorLoginRes.create(jsonRes)).finish();
                    const reEncryptedRes = encryptData(modifiedResProto);
                    if (reEncryptedRes) finalResBuffer = reEncryptedRes;

                } catch (e) {
                    dashboardRes = `[RES PROTO FAIL] ${e.message}`;
                }
            } else if (decryptedRes) {
                dashboardRes = "[DECRYPTED RAW] " + decryptedRes.toString('hex').substring(0, 100) + "...";
            } else {
                dashboardRes = `[ENCRYPTED HEX] ${resBuffer.toString('hex').substring(0, 100)}...`;
            }
        }

        // 🔥 4. SEND RESPONSE BACK TO GAME
        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        res.status(response.status).send(finalResBuffer);

        logTraffic(req.method, req.path, response.status, startTime, dashboardReq, dashboardRes);

    } catch (e) {
        if (!res.headersSent) res.status(502).send("GATEWAY ERROR");
        logTraffic(req.method, req.path, 502, startTime, dashboardReq, `[ERROR] ${e.message}`);
    }
});

// ==========================================
// 📊 DASHBOARD & LOGGING
// ==========================================
function logTraffic(method, path, status, startTime, reqData, resData) {
    requestLogs.unshift({
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    });
    if (requestLogs.length > 50) requestLogs.pop();
}

app.get('/romeo/ds', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>👑 King Aurora MITM</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
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
            <header class="flex justify-between items-center pb-4 mb-6 border-b border-purple-500/20">
                <div>
                    <h1 class="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tracking-widest uppercase">KING_NEXUS</h1>
                    <p class="text-[10px] text-purple-400/70 font-bold uppercase tracking-[0.3em] mt-1">Live Decryption Proxy</p>
                </div>
                <button onclick="clearLogs()" class="px-4 py-2 bg-black text-red-500 border border-red-500/50 hover:bg-red-950 transition-all text-[10px] font-black rounded-full tracking-widest">CLEAR LOGS</button>
            </header>
            <div id="logs-container" class="space-y-5"></div>
        </div>
        <script>
            let localLogs = [];
            async function clearLogs() { await fetch('/api/internal/clear', { method: 'POST' }); localLogs = []; render(); }
            function render() {
                const container = document.getElementById('logs-container');
                let html = '';
                localLogs.forEach(log => {
                    let isError = log.status >= 400;
                    let borderClass = isError ? 'border-red-500/30' : 'border-purple-500/30 aurora-glow';
                    html += \`
                    <div class="bg-black/60 backdrop-blur-md rounded-xl p-4 border \${borderClass} transition-all">
                        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                            <div class="flex items-center gap-3">
                                <span class="text-white font-black text-xs bg-white/10 px-2 py-1 rounded">\${log.method}</span>
                                <span class="text-purple-300 font-bold text-xs tracking-wide">\${log.path}</span>
                            </div>
                            <span class="\${isError ? 'text-red-400 bg-red-900/30' : 'text-emerald-400 bg-emerald-900/30'} text-xs font-black px-2 py-1 rounded">\${log.status}</span>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">APP REQUEST</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="text-purple-400/90">\${log.req}</pre></div>
                            </div>
                            <div class="relative">
                                <div class="absolute -top-2.5 left-3 bg-[#0a0a0a] text-gray-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-gray-700 tracking-widest">SERVER RESPONSE</div>
                                <div class="p-3 bg-black/80 rounded-lg border border-white/5 h-48 overflow-y-auto"><pre class="\${isError ? 'text-red-400/80' : 'text-gray-400/80'}">\${log.res}</pre></div>
                            </div>
                        </div>
                    </div>\`;
                });
                container.innerHTML = html;
            }
            setInterval(async () => {
                try {
                    const res = await fetch('/api/internal/logs');
                    const serverLogs = await res.json();
                    if(JSON.stringify(localLogs) !== JSON.stringify(serverLogs)) { localLogs = serverLogs; render(); }
                } catch(e) {}
            }, 1000);
        </script>
    </body>
    </html>
    `);
});

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });
app.listen(process.env.PORT || 3000);
