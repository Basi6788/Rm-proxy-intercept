const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 ASTUTECH HACK SERVERS
const ASTUTECH_API = 'https://srv0010.astutech.online';
const ASTUTECH_CONFIG = 'https://version.astutech.online';

// 🔑 TERA GUEST UID (The Master Key)
const MY_UID = "4627647913"; 

let requestLogs = []; 

// ==========================================
// 🛠️ AUTO-ACTIVATOR BOT LOGIC
// ==========================================
// Yeh function Astutech ke ad-server ko dhoka dega ke humne unki ad dekh li hai
async function activateUIDSilently() {
    try {
        console.log(`🤖 [BOT] Attempting to auto-activate UID: ${MY_UID}...`);
        
        // Yahan wo link ayega jahan Astutech activation check karta hai
        // Example: https://unlockffbeta.com/api/activate?uid=4627647913
        // Note: Tujhe is URL ko dhoondna hoga jo browser ads check ke baad hit karta hai.
        const activationURL = `https://unlockffbeta.com/api/activate?uid=${MY_UID}`; 
        
        const response = await fetch(activationURL, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            console.log(`✅ [BOT] UID ${MY_UID} Successfully Activated on Astutech!`);
        } else {
            console.log(`⚠️ [BOT] Activation failed, Status: ${response.status}`);
        }
    } catch (e) {
        console.log(`❌ [BOT] Activation Error: ${e.message}`);
    }
}

// Har 15 mins (900000 ms) baad activate karo
setInterval(activateUIDSilently, 900000); 

// Server start hotay hi pehli dafa activate karo
activateUIDSilently();

// ==========================================
// 🌌 THE DASHBOARD ROUTE (King Aurora)
// ==========================================
// ... (Dashboard ka HTML code waise ka waise hi rakh, usay yahan mat badalna) ...
app.get('/romeo/ds', (req, res) => {
    res.send(`<h1>Dashboard Active. Check logs.</h1>`); // Shortened for space
});

app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

// ==========================================
// 🧠 SMART PROXY ROUTER (Astutech With Bypassed UID)
// ==========================================
app.all('*', async (req, res) => {
    if (req.path === '/romeo/ds' || req.path.startsWith('/api/internal') || req.path === '/favicon.ico') return;

    const startTime = Date.now();
    let reqBuffer = Buffer.alloc(0);

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body)) {
        reqBuffer = req.body;
    }

    try {
        // Smart Routing: ver.php to Config, baqi sab API pe
        let targetBase = req.path.includes('.php') ? ASTUTECH_CONFIG : ASTUTECH_API;
        let pathUrl = req.originalUrl;
        if (pathUrl.startsWith('/')) pathUrl = pathUrl.substring(1); 
        const targetUrl = `${targetBase}/${pathUrl}`; 

        const headers = { ...req.headers };
        delete headers.host; 
        delete headers['accept-encoding']; 
        
        // Astutech ko tera asli network dikhega (IP Spoofing)
        headers['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const options = { method: req.method, headers };
        if (reqBuffer.length > 0) options.body = reqBuffer;

        // Forward to Astutech
        const response = await fetch(targetUrl, options);
        let resBuffer = Buffer.from(await response.arrayBuffer());
        let status = response.status;
        
        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        
        res.status(status).send(resBuffer);

        // LOGGING
        requestLogs.unshift({
            id: Date.now() + '-' + Math.floor(Math.random() * 1000),
            method: req.method,
            path: req.originalUrl,
            duration: `${Date.now() - startTime}ms`,
            status: status,
            route_type: "ASTUTECH (BYPASSED)",
            req: `Hex Length: ${reqBuffer.length}`,
            res: `Hex Length: ${resBuffer.length}`,
            full_req_hex: reqBuffer.toString('hex'), 
            full_res_hex: resBuffer.toString('hex')
        });

        if (requestLogs.length > 50) requestLogs.pop();

    } catch (e) {
        if (!res.headersSent) res.status(500).send("Proxy Bridge Error");
        console.error("Connection Dropped:", e.message);
    }
});

module.exports = app;
