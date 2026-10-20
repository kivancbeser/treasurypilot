import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([['/', ['index.html', 'text/html']], ['/src/app.js', ['src/app.js', 'text/javascript']], ['/src/treasury.js', ['src/treasury.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']]]);
http.createServer(async (req, res) => {
  const file = files.get(new URL(req.url, 'http://localhost').pathname);
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try { res.writeHead(200, { 'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff' }); res.end(await readFile(new URL(file[0], import.meta.url))); }
  catch { res.writeHead(500); res.end('Unable to load file'); }
}).listen(4173, '127.0.0.1', () => console.log('TreasuryPilot: http://127.0.0.1:4173'));
