import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { Store } from './backend/store.mjs';
import { createAPI } from './backend/api.mjs';
export function createServer(dataPath = process.env.TREASURY_DATA || fileURLToPath(new URL('./data/treasury.json', import.meta.url))) {
  const api = createAPI(new Store(dataPath));
  const files = new Map([['/', ['index.html', 'text/html']], ['/beta', ['beta.html', 'text/html']], ['/src/beta.js', ['src/beta.js', 'text/javascript']], ['/src/app.js', ['src/app.js', 'text/javascript']], ['/src/treasury.js', ['src/treasury.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
  return http.createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/api/')) return api(req, res);
    const file = files.get(path);
    if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
    try { const content = await readFile(new URL(file[0], import.meta.url)); res.writeHead(200, { 'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" }); res.end(req.method === 'HEAD' ? undefined : content); }
    catch { res.writeHead(500); res.end('Unable to load file'); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) createServer().listen(4173, '127.0.0.1', () => console.log('TreasuryPilot: http://127.0.0.1:4173 · Team beta: /beta'));
