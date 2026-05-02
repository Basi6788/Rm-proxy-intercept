const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

// 🚀 ASTUTECH SERVERS (Ab sara bundle hacking ka kaam inhi pe chhor diya)
const ASTUTECH_CONFIG = 'https://version.astutech.online';
const ASTUTECH_API = 'https://srv0010.astutech.online';

app.all('*', async (req, res) => {
    // Ignore internal requests
    if (req.path === '/favicon.ico') return res.status(204).end();

    const startTime = Date.now();
    
    // Smart routing: ver.php jaye config server pe, baqi sab jaye API server pe
    let targetBase = req.path.includes('.php') ? ASTUTECH_CONFIG : ASTUTECH_API;
    const pathUrl = req.originalUrl.startsWith('/') ? req.originalUrl : '/' + req.originalUrl;
    const targetUrl = `${targetBase}${pathUrl}`;

    try {
        const headers = { ...req.headers };
        delete headers.host;
        delete headers['accept-encoding'];
        
        // Asli IP chupane ki zarurat nahi, bot pehle hi activate kar raha hoga
        const options = { method: req.method, headers };
        
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
            options.body = req.body;
        }

        // Forward request directly to Astutech
        const response = await fetch(targetUrl, options);
        const resBuffer = Buffer.from(await response.arrayBuffer());

        // Return Astutech's modified response back to the game seamlessly
        response.headers.forEach((v, n) => {
            if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(n.toLowerCase())) {
                res.setHeader(n, v);
            }
        });
        
        res.status(response.status).send(resBuffer);

        // Sirf console me log karo takay server ki RAM farigh na ho (Dashboard hata diya for Max Speed)
        console.log(`[${response.status}] ${req.method} ${req.path} - ${Date.now() - startTime}ms`);

    } catch (error) {
        if (!res.headersSent) res.status(500).send("Proxy Bridge Error");
        console.error("Connection Dropped:", error.message);
    }
});

module.exports = app;
