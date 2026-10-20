import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createServer } from '../server.mjs';
import { Store } from '../backend/store.mjs';
import { passwordHash } from '../backend/auth.mjs';

test('team beta enforces auth, CSRF, roles, serialized budgets and durable storage', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'treasury-test-')); const path = join(dir, 'db.json');
  let server = createServer(path);
  try {
    const store = new Store(path);
    for (const [username, role] of [['owner', 'admin'], ['builder', 'requester'], ['reviewer', 'reviewer']]) {
      const credentials = await passwordHash('test-only-password-123');
      await store.transact(data => data.users.push({ username, role, ...credentials }));
    }
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    let base = `http://127.0.0.1:${server.address().port}`;
    async function call(route, body, session = {}, headers = {}) {
      const res = await fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: session.cookie || '', 'X-CSRF-Token': session.csrf || '', ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: res.status, body: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
    }
    async function login(username) { const result = await call('/api/login', { username, password: 'test-only-password-123' }); assert.equal(result.status, 200); return { cookie: result.cookie, csrf: result.body.csrf }; }
    assert.equal((await call('/api/workspace')).status, 401);
    assert.equal((await call('/api/login', { username: 'owner', password: 'wrong' })).status, 401);
    const owner = await login('owner'), builder = await login('builder'), reviewer = await login('reviewer');
    assert.equal((await call('/api/deposit', { amount: 100000 }, owner, { Origin: 'http://evil.invalid' })).status, 403);
    assert.equal((await call('/api/deposit', { amount: 100000 }, { cookie: owner.cookie })).status, 403);
    assert.equal((await call('/api/deposit', { amount: 100000 }, builder)).status, 403);
    assert.equal((await call('/api/deposit', { amount: 100000 }, owner)).status, 200);
    const payment = { bucketId: 'development', amount: 20000, recipient: '0x' + '1'.repeat(40), purpose: 'Milestone', requester: 'owner' };
    const results = await Promise.all([call('/api/request', payment, builder), call('/api/request', payment, builder)]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
    let workspace = await call('/api/workspace', undefined, owner);
    assert.equal(workspace.body.state.payments[0].requester, 'builder');
    assert.equal((await call('/api/review', { id: 1, approve: true }, builder)).status, 403);
    assert.equal((await call('/api/cancel', { id: 1 }, owner)).status, 400);
    assert.equal((await call('/api/review', { id: 1, approve: 'true' }, reviewer)).status, 400);
    assert.equal((await call('/api/review', { id: 1, approve: true }, reviewer)).status, 200);
    assert.equal((await call('/api/review', { id: 1, approve: true }, reviewer)).status, 400);
    // Even admins cannot self-approve their own requests.
    assert.equal((await call('/api/request', { ...payment, bucketId: 'reserve', amount: 100 }, owner)).status, 200);
    assert.equal((await call('/api/review', { id: 2, approve: true }, owner)).status, 400);
    assert.equal((await call('/api/cancel', { id: 2 }, owner)).status, 200);
    await new Promise(resolve => server.close(resolve));
    server = createServer(path); server.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await call('/api/workspace', undefined, owner)).status, 401);
    const again = await login('owner'); workspace = await call('/api/workspace', undefined, again);
    assert.equal(workspace.body.state.buckets[1].balance, 10000);
    assert.equal(workspace.body.state.payments.length, 2);
    assert.equal((await call('/api/logout', {}, again)).status, 200);
    assert.equal((await call('/api/workspace', undefined, again)).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); }
});
