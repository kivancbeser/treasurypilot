import { parseAmount } from './treasury.js';
let csrf = '', user;
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
async function api(path, body) {
  const res = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json();
  if (!res.ok) { if (res.status === 401) signedOut(); throw new Error(data.error); } return data;
}
function signedOut() { csrf = ''; user = undefined; $('#workspace').hidden = true; $('#login-panel').hidden = false; $('#logout').hidden = true; $('#payments').replaceChildren(); $('#events').replaceChildren(); }
async function run(action) { document.querySelectorAll('button').forEach(b => b.disabled = true); try { await action(); $('#feedback').textContent = 'Updated. Simulated funds only.'; } catch (error) { $('#feedback').textContent = error.message; } finally { document.querySelectorAll('button').forEach(b => b.disabled = false); } }
async function refresh() {
  const data = await api('/api/workspace'); user = data.user; csrf = data.csrf;
  $('#workspace').hidden = false; $('#login-panel').hidden = true; $('#logout').hidden = false;
  $('#identity').textContent = `${user.username} · ${user.role}`;
  $('#admin-panel').hidden = user.role !== 'admin'; $('#request-panel').hidden = !['admin', 'requester'].includes(user.role);
  const state = data.state, total = state.buckets.reduce((s, b) => s + b.balance, 0), pending = state.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  $('#summary').replaceChildren(...[['Treasury balance', total], ['Reserved', pending], ['Available', total - pending]].map(([label, value]) => { const n = el('article', '', 'stat'); n.append(el('p', label, 'muted'), el('strong', money(value))); return n; }));
  $('#budgets').replaceChildren(...state.buckets.map(b => { const n = el('article', '', 'budget'); n.append(el('p', `${b.name} · ${b.percent}%`), el('strong', money(b.balance))); return n; }));
  $('#weights').replaceChildren(...state.buckets.map(b => { const n = el('div', ''); const label = el('label', b.name); label.htmlFor = `weight-${b.id}`; const input = el('input', ''); input.id = `weight-${b.id}`; input.name = b.id; input.type = 'number'; input.min = '0'; input.max = '100'; input.required = true; input.value = b.percent; n.append(label, input); return n; }));
  $('#payments').replaceChildren(...state.payments.map(p => {
    const n = el('div', '', 'payment'); const detail = el('div', ''); detail.append(el('strong', `#${p.id} ${p.purpose}`), el('p', `${p.recipient} · ${p.bucketId}`, 'muted small'), el('p', `${p.requester}${p.reviewer ? ` → ${p.reviewer}` : ''}`, 'small')); n.append(detail, el('strong', money(p.amount)), el('span', p.status, 'pill'));
    if (p.status === 'pending') {
      if (p.requester === user.username && ['admin', 'requester'].includes(user.role)) { const b = el('button', 'Cancel', 'secondary'); b.onclick = () => mutate('/api/cancel', { id: p.id }); n.append(b); }
      if (p.requester !== user.username && ['admin', 'reviewer'].includes(user.role)) for (const approve of [true, false]) { const b = el('button', approve ? 'Approve' : 'Reject', approve ? '' : 'secondary'); b.onclick = () => mutate('/api/review', { id: p.id, approve }); n.append(b); }
    } return n;
  }));
  if (!state.payments.length) $('#payments').append(el('p', 'No payment requests yet.', 'muted'));
  $('#events').replaceChildren(...state.events.map(e => el('li', e)));
}
function mutate(path, body) { return run(async () => { await api(path, body); await refresh(); }); }
$('#login').onsubmit = event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); run(async () => { const result = await api('/api/login', data); csrf = result.csrf; event.target.reset(); await refresh(); }); };
$('#logout').onclick = () => run(async () => { await api('/api/logout', {}); signedOut(); });
$('#refresh').onclick = () => run(refresh);
$('#deposit').onsubmit = event => { event.preventDefault(); run(async () => { await api('/api/deposit', { amount: parseAmount(new FormData(event.target).get('amount')) }); event.target.reset(); await refresh(); }); };
$('#policy').onsubmit = event => { event.preventDefault(); mutate('/api/policy', { percentages: [...new FormData(event.target).values()].map(Number) }); };
$('#request').onsubmit = event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); run(async () => { await api('/api/request', { ...data, recipient: data.recipient.trim(), amount: parseAmount(data.amount) }); event.target.reset(); await refresh(); }); };
refresh().catch(error => { if (error.message !== 'Sign in required') $('#feedback').textContent = error.message; });
