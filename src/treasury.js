export const initialState = () => ({ income: 0, buckets: [
  { id: 'reserve', name: 'Operating reserve', percent: 40, balance: 0 },
  { id: 'development', name: 'Development', percent: 30, balance: 0 },
  { id: 'marketing', name: 'Marketing', percent: 20, balance: 0 },
  { id: 'community', name: 'Community', percent: 10, balance: 0 }
], payments: [], events: [] });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export function parseAmount(value) {
  assert(/^\d+(\.\d{1,2})?$/.test(String(value)), 'Enter a positive amount with at most two decimals.');
  const [whole, fraction = ''] = String(value).split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  assert(Number.isSafeInteger(cents) && cents > 0, 'Amount must be positive and within the supported range.');
  return cents;
}
export function deposit(state, cents) {
  assert(Number.isSafeInteger(cents) && cents > 0 && Number.isSafeInteger(state.income + cents), 'Invalid deposit amount.');
  assert(state.buckets.reduce((sum, b) => sum + b.percent, 0) === 100, 'Allocation must total 100%.');
  // Largest-remainder allocation preserves cents without funding zero-percent buckets.
  const shares = state.buckets.map((b, index) => ({ index, amount: Math.floor(cents / 100) * b.percent + Math.floor((cents % 100) * b.percent / 100), remainder: (cents % 100) * b.percent % 100 }));
  let remaining = cents - shares.reduce((sum, share) => sum + share.amount, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (remaining-- > 0) share.amount++;
  }
  shares.forEach(share => { state.buckets[share.index].balance += share.amount; });
  state.income += cents;
  state.events.unshift(`Recorded ${(cents / 100).toFixed(2)} demo USD revenue; allocated to four budgets.`);
}
export function requestPayment(state, { bucketId, amount, recipient, purpose, requester }) {
  const bucket = state.buckets.find(b => b.id === bucketId);
  assert(bucket, 'Unknown budget.');
  assert(Number.isSafeInteger(amount) && amount > 0, 'Invalid payment amount.');
  assert(/^0x[a-fA-F0-9]{40}$/.test(recipient) && !/^0x0{40}$/i.test(recipient), 'Enter a valid 0x wallet address.');
  assert(typeof purpose === 'string' && purpose.trim() && purpose.length <= 200 && typeof requester === 'string' && requester.trim(), 'Purpose and requester are required.');
  const reserved = state.payments.filter(p => p.bucketId === bucketId && p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  assert(amount <= bucket.balance - reserved, 'Insufficient unreserved budget.');
  const payment = { id: Math.max(0, ...state.payments.map(p => p.id)) + 1, bucketId, amount, recipient, purpose: purpose.trim(), requester, createdAt: new Date().toISOString(), status: 'pending' };
  state.payments.unshift(payment);
  state.events.unshift(`Payment #${payment.id} requested by ${requester}; budget reserved.`);
  return payment;
}
export function resolvePayment(state, id, approver, approve) {
  const payment = state.payments.find(p => p.id === id);
  assert(payment && payment.status === 'pending', 'Payment is no longer pending.');
  assert(approver && approver !== payment.requester, 'A different team member must review this payment.');
  const bucket = state.buckets.find(b => b.id === payment.bucketId);
  if (approve) {
    assert(bucket.balance >= payment.amount, 'Insufficient budget.');
    bucket.balance -= payment.amount;
  }
  payment.status = approve ? 'approved' : 'rejected';
  payment.reviewer = approver;
  state.events.unshift(`Payment #${id} ${payment.status} by ${approver}${approve ? ' (simulation; no funds sent)' : '; reservation released'}.`);
}

export function updatePolicy(state, percentages) {
  assert(Array.isArray(percentages) && percentages.length === state.buckets.length && percentages.every(p => Number.isInteger(p) && p >= 0 && p <= 100), 'Use whole percentages between 0 and 100.');
  assert(percentages.reduce((sum, p) => sum + p, 0) === 100, 'Allocation must total exactly 100%.');
  state.buckets.forEach((b, i) => { b.percent = percentages[i]; });
  state.events.unshift(`Policy updated to ${percentages.join(' / ')}. Applies to future revenue only.`);
}
export function paymentsCSV(state) {
  // Neutralize spreadsheet formula prefixes in user-provided cells.
  const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  return [['ID', 'Created at', 'Budget', 'Amount (demo USD)', 'Recipient', 'Purpose', 'Requester', 'Status', 'Reviewer'], ...state.payments.map(p => [p.id, p.createdAt, p.bucketId, (p.amount / 100).toFixed(2), p.recipient, p.purpose, p.requester, p.status, p.reviewer])].map(row => row.map(cell).join(',')).join('\r\n');
}

export function cancelPayment(state, id, requester) {
  const payment = state.payments.find(p => p.id === id);
  assert(payment && payment.status === 'pending', 'Only pending requests can be cancelled.');
  assert(payment.requester === requester, 'Only the requester can cancel this payment.');
  payment.status = 'cancelled';
  state.events.unshift(`Payment #${id} cancelled by ${requester}; reservation released.`);
}

export function validateState(state) {
  try {
    const templates = initialState().buckets;
    assert(state && Number.isSafeInteger(state.income) && state.income >= 0, 'Invalid income.');
    assert(Array.isArray(state.buckets) && state.buckets.length === templates.length, 'Invalid budgets.');
    state.buckets.forEach((b, i) => assert(b.id === templates[i].id && b.name === templates[i].name && Number.isSafeInteger(b.balance) && b.balance >= 0 && Number.isInteger(b.percent) && b.percent >= 0 && b.percent <= 100, 'Invalid budget.'));
    assert(state.buckets.reduce((sum, b) => sum + b.percent, 0) === 100, 'Invalid policy.');
    assert(Array.isArray(state.payments) && Array.isArray(state.events) && state.events.every(e => typeof e === 'string'), 'Invalid records.');
    const ids = new Set();
    let spent = 0;
    state.payments.forEach(p => {
      assert(Number.isSafeInteger(p.id) && p.id > 0 && !ids.has(p.id), 'Invalid payment ID.'); ids.add(p.id);
      assert(templates.some(b => b.id === p.bucketId) && Number.isSafeInteger(p.amount) && p.amount > 0, 'Invalid payment.');
      assert(typeof p.recipient === 'string' && /^0x[a-fA-F0-9]{40}$/.test(p.recipient) && !/^0x0{40}$/i.test(p.recipient), 'Invalid recipient.');
      assert(typeof p.purpose === 'string' && p.purpose.trim().length > 0 && p.purpose.length <= 200 && typeof p.requester === 'string' && p.requester.trim(), 'Invalid payment metadata.');
      assert(['pending', 'approved', 'rejected', 'cancelled'].includes(p.status), 'Invalid status.');
      if (p.status === 'approved' || p.status === 'rejected') assert(typeof p.reviewer === 'string' && p.reviewer.trim() && p.reviewer !== p.requester, 'Invalid review.');
      if (p.status === 'approved') { spent += p.amount; assert(Number.isSafeInteger(spent), 'Invalid spending.'); }
    });
    const balances = state.buckets.reduce((sum, b) => sum + b.balance, 0);
    assert(Number.isSafeInteger(balances) && balances + spent === state.income, 'Accounting mismatch.');
    state.buckets.forEach(b => assert(state.payments.filter(p => p.bucketId === b.id && p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) <= b.balance, 'Over-reserved budget.'));
    return true;
  } catch { return false; }
}

export function exampleState() {
  const state = initialState();
  deposit(state, 1000000);
  const first = requestPayment(state, { bucketId: 'development', amount: 120000, recipient: '0x1111111111111111111111111111111111111111', purpose: 'Frontend milestone delivery', requester: 'Kivanc' });
  resolvePayment(state, first.id, 'Alex', true);
  requestPayment(state, { bucketId: 'marketing', amount: 45000, recipient: '0x2222222222222222222222222222222222222222', purpose: 'Launch explainer video', requester: 'Kivanc' });
  state.events.unshift('Loaded fictional sample workspace. These entries are not real usage or revenue.');
  return state;
}
