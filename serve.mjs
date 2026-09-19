#!/usr/bin/env node
/**
 * HTTPS static server for Quest / WebXR testing.
 * Quest requires HTTPS (self-signed is fine after you accept the warning).
 *
 *   node serve.mjs
 *   → https://localhost:8443
 *   → https://<LAN-IP>:8443  (open this on the Quest browser)
 */
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8443);
const HOST = process.env.HOST || '0.0.0.0';

const key = fs.readFileSync(path.join(ROOT, 'certs', 'key.pem'));
const cert = fs.readFileSync(path.join(ROOT, 'certs', 'cert.pem'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

function lanIPs() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) out.push(info.address);
    }
  }
  return out;
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const rel = decoded === '/' ? '/index.html' : decoded;
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root)) return null;
  return full;
}

const server = https.createServer({ key, cert }, (req, res) => {
  const filePath = safeJoin(ROOT, req.url);
  if (!filePath) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  const ips = lanIPs();
  console.log('');
  console.log('  STARLINER HTTPS server');
  console.log('  ─────────────────────');
  console.log(`  Local:  https://localhost:${PORT}`);
  for (const ip of ips) {
    console.log(`  Quest:  https://${ip}:${PORT}`);
  }
  console.log('');
  console.log('  On Quest 2: same Wi‑Fi → browser → Quest URL above');
  console.log('  Accept the certificate warning, then Enter VR.');
  console.log('  Optional music: put track.mp3 next to index.html');
  console.log('');
});
