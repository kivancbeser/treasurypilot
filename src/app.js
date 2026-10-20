import { initialState, parseAmount, deposit, requestPayment, resolvePayment } from './treasury.js';
const key = 'treasurypilot-demo-v1';
let state = initialState();
try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && saved.buckets?.length === 4 && Array.isArray(saved.payments) && Array.isArray(saved.events) && Number.isSafeInteger(saved.income)) state = saved; } catch {}
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
function render() {
  const total = state.buckets.reduce((s, b) => s + b.balance, 0);
  const pending = state.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  document.querySelector('#overview').replaceChildren(...[['Treasury balance', money(total)], ['Lifetime revenue', money(state.income)], ['Awaiting approval', money(pending)]].map(([label, value]) => { const card = el('article', undefined, 'stat'); card.append(el('p', label, 'muted'), el('strong', value)); return card; }));
  document.querySelector('#budgets').replaceChildren(...state.buckets.map((b, i) => { const card = el('article', undefined, `budget color-${i}`); const reserved = state.payments.filter(p => p.bucketId === b.id && p.status === 'pending').reduce((s, p) => s + p.amount, 0); card.append(el('p', `${b.percent}% · ${b.name}`), el('strong', money(b.balance)), el('p', `${money(b.balance - reserved)} available`, 'small muted')); return card; }));
  const list = document.querySelector('#payment-list'); list.replaceChildren();
  if (!state.payments.length) list.append(el('p', 'Your review queue is clear. Create a payment request to try the approval flow.', 'empty'));
  state.payments.forEach(p => { const row = el('div', undefined, 'payment'); const detail = el('div'); detail.append(el('strong', p.purpose), el('p', `${p.recipient.slice(0, 8)}…${p.recipient.slice(-6)} · ${p.bucketId}`, 'muted small')); row.append(detail, el('strong', money(p.amount)), el('span', p.status, 'pill')); if (p.status === 'pending') for (const [text, approve] of [['Approve', true], ['Reject', false]]) { const button = el('button', text, approve ? '' : 'secondary'); button.onclick = () => perform(() => resolvePayment(state, p.id, 'Alex', approve)); row.append(button); } list.append(row); });
  document.querySelector('#events').replaceChildren(...state.events.map(event => el('li', event)));
}
function perform(action) { try { action(); render(); try { localStorage.setItem(key, JSON.stringify(state)); } catch {} document.querySelector('#feedback').textContent = 'Demo updated. No real funds moved.'; } catch (error) { document.querySelector('#feedback').textContent = error.message; } }
document.querySelector('#deposit').onsubmit = event => { event.preventDefault(); perform(() => deposit(state, parseAmount(new FormData(event.target).get('amount')))); };
document.querySelector('#request').onsubmit = event => { event.preventDefault(); const data = new FormData(event.target); perform(() => requestPayment(state, { bucketId: data.get('bucket'), amount: parseAmount(data.get('amount')), recipient: data.get('recipient').trim(), purpose: data.get('purpose'), requester: 'Kivanc' })); };
document.querySelector('#reset').onclick = () => perform(() => { state = initialState(); });
render();
