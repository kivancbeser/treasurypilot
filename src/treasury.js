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
  let remaining = cents;
  state.buckets.forEach((b, index) => {
    const share = index === state.buckets.length - 1 ? remaining : Math.floor(cents * b.percent / 100);
    b.balance += share; remaining -= share;
  });
  state.income += cents;
  state.events.unshift(`Recorded ${(cents / 100).toFixed(2)} demo USD revenue; allocated to four budgets.`);
}
export function requestPayment(state, { bucketId, amount, recipient, purpose, requester }) {
  const bucket = state.buckets.find(b => b.id === bucketId);
  assert(bucket, 'Unknown budget.');
  assert(Number.isSafeInteger(amount) && amount > 0, 'Invalid payment amount.');
  assert(/^0x[a-fA-F0-9]{40}$/.test(recipient), 'Enter a valid 0x wallet address.');
  assert(purpose.trim() && requester, 'Purpose and requester are required.');
  const reserved = state.payments.filter(p => p.bucketId === bucketId && p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  assert(amount <= bucket.balance - reserved, 'Insufficient unreserved budget.');
  const payment = { id: state.payments.length + 1, bucketId, amount, recipient, purpose: purpose.trim(), requester, status: 'pending' };
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
