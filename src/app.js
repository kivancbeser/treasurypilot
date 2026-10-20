import { initialState, parseAmount, deposit, requestPayment, resolvePayment, updatePolicy, paymentsCSV, cancelPayment, validateState, exampleState, runwayScenario } from './treasury.js';
const key = 'treasurypilot-demo-v1';
let state = initialState();
let storageWarning = '';
try { const raw = localStorage.getItem(key); if (raw) { const saved = JSON.parse(raw); if (validateState(saved)) state = saved; else storageWarning = 'Saved demo data failed validation. Started a clean workspace.'; } } catch { storageWarning = 'Saved demo data could not be read. Started a clean workspace.'; }
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
const el = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
function render() {
  document.querySelector('#runway-result').textContent = 'Enter your assumptions to explore runway.';
  const total = state.buckets.reduce((s, b) => s + b.balance, 0);
  const pending = state.payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  document.querySelector('#overview').replaceChildren(...[['Treasury balance', money(total)], ['Lifetime revenue', money(state.income)], ['Awaiting approval', money(pending)]].map(([label, value]) => { const card = el('article', undefined, 'stat'); card.append(el('p', label, 'muted'), el('strong', value)); return card; }));
  document.querySelector('#budgets').replaceChildren(...state.buckets.map((b, i) => { const card = el('article', undefined, `budget color-${i}`); const reserved = state.payments.filter(p => p.bucketId === b.id && p.status === 'pending').reduce((s, p) => s + p.amount, 0); card.append(el('p', `${b.percent}% · ${b.name}`), el('strong', money(b.balance)), el('p', `${money(b.balance - reserved)} available`, 'small muted')); return card; }));
  const approved = state.payments.filter(p => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  const insights = document.querySelector('#insights');
  insights.replaceChildren(el('p', 'TREASURY HEALTH', 'eyebrow'), el('h2', `${money(total - pending)} available after reservations`), el('p', `${money(approved)} approved spending · ${state.payments.filter(p => p.status === 'pending').length} requests awaiting review`, 'muted'));
  document.querySelector('#policy-inputs').replaceChildren(...state.buckets.map(b => { const wrap = el('div'); const label = el('label', `${b.name} %`); label.htmlFor = `policy-${b.id}`; const input = el('input'); input.id = `policy-${b.id}`; input.name = b.id; input.type = 'number'; input.min = '0'; input.max = '100'; input.step = '1'; input.required = true; input.value = b.percent; input.oninput = policyTotal; wrap.append(label, input); return wrap; }));
  policyTotal();
  const list = document.querySelector('#payment-list'); list.replaceChildren();
  const visible = state.payments.filter(p => document.querySelector('#status-filter').value === 'all' || p.status === document.querySelector('#status-filter').value);
  if (!visible.length) list.append(el('p', 'No payments match this view. Create a request or choose another status.', 'empty'));
  visible.forEach(p => {
    const row = el('div', undefined, 'payment'); const detail = el('div');
    detail.append(el('strong', `#${p.id} · ${p.purpose}`), el('p', `${p.recipient} · ${p.bucketId}`, 'muted small'), el('p', `Requested by ${p.requester}${p.reviewer ? ` · Reviewed by ${p.reviewer}` : ''}`, 'muted small'));
    row.append(detail, el('strong', money(p.amount)), el('span', p.status, `pill status-${p.status}`));
    if (p.status === 'pending') {
      const actor = document.querySelector('#actor').value;
      if (actor === p.requester) {
        const cancel = el('button', 'Cancel request', 'secondary'); cancel.onclick = () => perform(() => cancelPayment(state, p.id, actor)); row.append(cancel, el('span', 'Another member must review', 'small muted'));
      } else for (const [text, approve] of [['Approve', true], ['Reject', false]]) {
        const button = el('button', text, approve ? '' : 'secondary'); button.onclick = () => perform(() => resolvePayment(state, p.id, actor, approve)); row.append(button);
      }
    }
    list.append(row);
  });
  document.querySelector('#events').replaceChildren(...state.events.map(event => el('li', event)));
}
function perform(action) { try { action(); render(); let message = 'Demo updated. No real funds moved.'; try { localStorage.setItem(key, JSON.stringify(state)); } catch { message += ' Browser storage is unavailable; changes will not survive reload.'; } document.querySelector('#feedback').textContent = message; } catch (error) { document.querySelector('#feedback').textContent = error.message; } }
document.querySelector('#deposit').onsubmit = event => { event.preventDefault(); perform(() => deposit(state, parseAmount(new FormData(event.target).get('amount')))); };
document.querySelector('#request').onsubmit = event => { event.preventDefault(); const data = new FormData(event.target); perform(() => { requestPayment(state, { bucketId: data.get('bucket'), amount: parseAmount(data.get('amount')), recipient: data.get('recipient').trim(), purpose: data.get('purpose'), requester: 'Kivanc' }); event.target.reset(); }); };
let replacement = initialState;
function replaceWorkspace(factory, title) { replacement = factory; document.querySelector('#replace-title').textContent = title; document.querySelector('#replace-dialog').showModal(); }
document.querySelector('#reset').onclick = () => replaceWorkspace(initialState, 'Reset your demo workspace?');
document.querySelector('#sample').onclick = () => replaceWorkspace(exampleState, 'Load fictional sample data?');
document.querySelector('#replace-cancel').onclick = () => document.querySelector('#replace-dialog').close();
document.querySelector('#replace-confirm').onclick = () => { perform(() => { state = replacement(); }); document.querySelector('#replace-dialog').close(); };
document.querySelector('#actor').onchange = render;
function policyTotal() {
  const total = [...document.querySelectorAll('#policy-inputs input')].reduce((sum, input) => sum + Number(input.value), 0);
  const node = document.querySelector('#policy-total'); node.textContent = `Total: ${total}% · ${total === 100 ? 'Ready to save' : 'Must equal 100%'}`;
}
document.querySelector('#policy').onsubmit = event => { event.preventDefault(); const data = new FormData(event.target); perform(() => updatePolicy(state, state.buckets.map(b => Number(data.get(b.id))))); };
document.querySelector('#status-filter').onchange = render;
document.querySelector('#export').onclick = () => {
  const url = URL.createObjectURL(new Blob([paymentsCSV(state)], { type: 'text/csv;charset=utf-8;' }));
  const link = el('a'); link.href = url; link.download = 'treasurypilot-payments.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#feedback').textContent = 'Exported all payment statuses. Demo data only.';
};
render();

if (storageWarning) document.querySelector('#feedback').textContent = storageWarning;

document.querySelector('#runway').onsubmit = event => {
  event.preventDefault();
  try {
    const data = new FormData(event.target), revenue = data.get('revenue').trim();
    const result = runwayScenario(state, parseAmount(data.get('cost').trim()), /^(0|0\.0{1,2})$/.test(revenue) ? 0 : parseAmount(revenue));
    document.querySelector('#runway-result').textContent = result.available === 0 ? 'No unreserved balance available. Record simulated revenue or release a reservation to explore a funded scenario.' : result.months === null ? `Under these assumptions, revenue covers monthly spending. Available balance: ${money(result.available)}. This does not guarantee sustainability.` : `${result.months.toFixed(1)} months of estimated runway · ${money(result.available)} available · ${money(result.netBurn)} assumed monthly net spending. This excludes unexpected costs and changes in revenue.`;
  } catch (error) { document.querySelector('#runway-result').textContent = error.message; }
};
