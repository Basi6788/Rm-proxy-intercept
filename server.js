const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const protobuf = require('protobufjs');

const app = express();
app.use(cors());
app.use(express.raw({ type: '*/*', limit: '100mb' }));

const GARENA_API = 'https://loginbp.ggpolarbear.com';
const AES_KEY = Buffer.from('Yg&tc%DEuh6%Zc^8', 'utf8');
const AES_IV  = Buffer.from('6oyZDr22E3ychjM%', 'utf8');
const ALGO    = 'aes-128-cbc';

// 👕 TERE BUNDLES KI IDs (Yahan apni Item IDs dalo)
const MY_CUSTOM_BUNDLE = [101001, 102005, 103010, 201002]; 

let requestLogs = [];
let MajorLoginReq, MajorLoginRes, GetOutfitRes;

// Proto Loaders
protobuf.load("MajorLoginReq.proto").then(r => MajorLoginReq = r.lookupType("MajorLogin")).catch(() => {});
protobuf.load("MajorLoginRes.proto").then(r => MajorLoginRes = r.lookupType("MajorLoginRes")).catch(() => {});
protobuf.load("GetOutfit.proto").then(r => GetOutfitRes = r.lookupType("CSGetOutfitRes")).catch(() => {});

function decrypt(buffer) {
    try {
        const decipher = crypto.createDecipheriv(ALGO, AES_KEY, AES_IV);
        return Buffer.concat([decipher.update(buffer), decipher.final()]);
    } catch (e) { return null; }
}

function encrypt(buffer) {
    try {
        const cipher = crypto.createCipheriv(ALGO, AES_KEY, AES_IV);
        return Buffer.concat([cipher.update(buffer), cipher.final()]);
    } catch (e) { return null; }
}

function logTraffic(method, path, status, startTime, reqData, resData) {
    console.log(`[${method}] ${path} - ${status}`); // Terminal pe bhi logs dikhayega
    requestLogs.unshift({
        id: Date.now() + '-' + Math.floor(Math.random() * 1000),
        method, path, status,
        duration: `${Date.now() - startTime}ms`,
        req: reqData, res: resData
    });
    if (requestLogs.length > 100) requestLogs.pop(); // Capacity barha di hai
}

// Routes
app.get('/api/internal/logs', (req, res) => res.json(requestLogs));
app.post('/api/internal/clear', (req, res) => { requestLogs = []; res.json({ success: true }); });

app.all('*', async (req, res) => {
    const startTime = Date.now();
    if (req.path === '/favicon.ico' || req.path === '/romeo/ds') return;

    let reqBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    let parsedReqLog = "[RAW BINARY]";
    let parsedResLog = "[RAW BINARY]";

    // MajorLogin Decryption
    if (req.path.includes('MajorLogin') && reqBuffer.length > 0) {
        const dec = decrypt(reqBuffer);
        if (dec && MajorLoginReq) {
            parsedReqLog = JSON.stringify(MajorLoginReq.toObject(MajorLoginReq.decode(dec), {defaults:true}), null, 2);
        }
    }

    try {
        const targetUrl = `${GARENA_API}${req.originalUrl}`;
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: { ...req.headers, host: new URL(GARENA_API).host },
            body: reqBuffer.length > 0 ? reqBuffer : undefined
        });

        let resBuffer = Buffer.from(await response.arrayBuffer());

        // 🧥 BUNDLE INJECTION LOGIC
        if (req.path.includes('GetAccountOutfit') || req.path.includes('GetOutfit')) {
            if (GetOutfitRes) {
                try {
                    let decodedRes = GetOutfitRes.decode(resBuffer);
                    
                    // Yahan hum bundles force-add kar rahe hain
                    if (decodedRes.ProfileInfo) {
                        decodedRes.ProfileInfo.Clothes = [...new Set([...decodedRes.ProfileInfo.Clothes, ...MY_CUSTOM_BUNDLE])];
                        parsedResLog = "BUNDLES INJECTED: " + JSON.stringify(decodedRes.ProfileInfo.Clothes);
                        
                        // Encode back to send to game
                        resBuffer = GetOutfitRes.encode(decodedRes).finish();
                    }
                } catch(e) { parsedResLog = "Proto Error: " + e.message; }
            }
        }

        // Generic Logging for all other requests
        if (parsedResLog === "[RAW BINARY]" && resBuffer.length > 0) {
            parsedResLog = `Data Size: ${resBuffer.length} bytes`;
        }

        res.status(response.status).send(resBuffer);
        logTraffic(req.method, req.path, response.status, startTime, parsedReqLog, parsedResLog);

    } catch (e) {
        res.status(502).end();
        logTraffic(req.method, req.path, 502, startTime, parsedReqLog, "Error: " + e.message);
    }
});

app.listen(process.env.PORT || 3000);
