import { token, digest, verifyPassword, passwordHash } from './auth.mjs';
import { deposit, requestPayment, resolvePayment, cancelPayment, updatePolicy, paymentsCSV } from '../src/treasury.js';
export function createAPI(store) {
  const sessions = new Map(), attempts = new Map();
  const dummy = passwordHash('dummy-password-never-valid');
  return async function api(req, res) {
    const path = new URL(req.url, 'http://localhost').pathname;
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    try {
      // Local beta accepts same-origin browser mutations only. CLI clients may omit Origin.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: 'Origin not allowed' });
      let body = {};
      if (req.method === 'POST') {
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(415, { error: 'JSON required' });
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) return send(413, { error: 'Request too large' }); }
        try { body = JSON.parse(raw); } catch { return send(400, { error: 'Invalid JSON' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'Invalid request' });
      }
      const now = Date.now();
      for (const [key, session] of sessions) if (session.expires <= now) sessions.delete(key);
      for (const [key, attempt] of attempts) if (attempt.until <= now) attempts.delete(key);
      if (path === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress; const attempt = attempts.get(ip);
        if (attempt?.count >= 10) return send(429, { error: 'Too many attempts. Try again in 15 minutes.' });
        attempts.set(ip, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 900000 });
        if (typeof body.username !== 'string' || typeof body.password !== 'string' || body.password.length > 128) return send(401, { error: 'Invalid credentials' });
        const data = await store.read(); const user = data.users.find(u => u.username === body.username);
        const valid = await verifyPassword(body.password, user || await dummy);
        if (!user || !valid) return send(401, { error: 'Invalid credentials' });
        attempts.delete(ip);
        const secret = token(), csrf = token();
        sessions.set(digest(secret), { username: user.username, csrf, expires: now + 8 * 3600000 });
        res.setHeader('Set-Cookie', `tp_session=${secret}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);
        return send(200, { username: user.username, role: user.role, csrf });
      }
      const secret = /(?:^|;\s*)tp_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const session = secret && sessions.get(digest(secret));
      if (!session) return send(401, { error: 'Sign in required' });
      const data = await store.read(); const user = data.users.find(u => u.username === session.username);
      if (!user) return send(401, { error: 'Account unavailable' });
      if (req.method === 'GET' && path === '/api/workspace') return send(200, { state: data.state, user: { username: user.username, role: user.role }, csrf: session.csrf });
      if (req.method === 'GET' && path === '/api/payments.csv') { res.writeHead(200, { 'Content-Type': 'text/csv', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="treasurypilot-payments.csv"' }); return res.end(paymentsCSV(data.state)); }
      if (req.method !== 'POST') return send(404, { error: 'Not found' });
      if (req.headers['x-csrf-token'] !== session.csrf) return send(403, { error: 'Invalid CSRF token' });
      if (path === '/api/logout') { sessions.delete(digest(secret)); res.setHeader('Set-Cookie', 'tp_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return send(200, { ok: true }); }
      const permissions = { '/api/deposit': ['admin'], '/api/policy': ['admin'], '/api/request': ['admin', 'requester'], '/api/review': ['admin', 'reviewer'], '/api/cancel': ['admin', 'requester'] };
      if (!permissions[path]) return send(404, { error: 'Not found' });
      if (!permissions[path].includes(user.role)) return send(403, { error: 'Your role cannot perform this action' });
      await store.transact(current => {
        // Recheck membership under the same serialized operation as the mutation.
        const member = current.users.find(u => u.username === session.username);
        if (!member || !permissions[path].includes(member.role)) throw new Error('Permission changed; sign in again');
        if (path === '/api/deposit') deposit(current.state, body.amount);
        if (path === '/api/policy') updatePolicy(current.state, body.percentages);
        if (path === '/api/request') requestPayment(current.state, { bucketId: body.bucketId, amount: body.amount, recipient: body.recipient, purpose: body.purpose, requester: member.username });
        if (path === '/api/review') { if (typeof body.approve !== 'boolean') throw new Error('Review decision must be boolean'); resolvePayment(current.state, body.id, member.username, body.approve); }
        if (path === '/api/cancel') cancelPayment(current.state, body.id, member.username);
      });
      return send(200, { state: (await store.read()).state });
    } catch (error) { if (/Invalid database|Accounting invariant|EACCES|ENOENT/.test(error.message)) return send(500, { error: 'Storage unavailable' }); return send(400, { error: error.message }); }
  };
}
