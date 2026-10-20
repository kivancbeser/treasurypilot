import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, parseAmount, deposit, requestPayment, resolvePayment } from '../src/treasury.js';
const wallet = '0x' + 'a'.repeat(40);
test('decimal inputs are represented as exact cents', () => { assert.equal(parseAmount('0.29'), 29); for (const value of ['0', '-1', 'NaN', '1.001', '1e3']) assert.throws(() => parseAmount(value)); });
test('allocation conserves every cent including rounding remainder', () => { for (const value of [1, 29, 101, 100000]) { const state = initialState(); deposit(state, value); assert.equal(state.buckets.reduce((s, b) => s + b.balance, 0), value); } });
test('pending requests reserve budget; self-review and repeated settlement fail', () => { const state = initialState(); deposit(state, 100000); const input = { bucketId: 'development', amount: 20000, recipient: wallet, purpose: 'Build', requester: 'Kivanc' }; const p = requestPayment(state, input); assert.throws(() => requestPayment(state, input), /Insufficient/); assert.throws(() => resolvePayment(state, p.id, 'Kivanc', true), /different/); resolvePayment(state, p.id, 'Alex', true); assert.equal(state.buckets[1].balance, 10000); assert.throws(() => resolvePayment(state, p.id, 'Alex', true)); });
test('rejection releases reservation without spending budget', () => { const state = initialState(); deposit(state, 100000); const input = { bucketId: 'development', amount: 30000, recipient: wallet, purpose: 'Build', requester: 'Kivanc' }; const p = requestPayment(state, input); resolvePayment(state, p.id, 'Alex', false); assert.equal(state.buckets[1].balance, 30000); assert.doesNotThrow(() => requestPayment(state, input)); });

test('policy changes affect future revenue only and reject invalid totals', async () => {
  const { updatePolicy } = await import('../src/treasury.js');
  const state = initialState(); deposit(state, 10000);
  assert.throws(() => updatePolicy(state, [40, 30, 20, 20]));
  assert.throws(() => updatePolicy(state, [-10, 50, 30, 30]));
  assert.throws(() => updatePolicy(state, [40.5, 29.5, 20, 10]));
  updatePolicy(state, [100, 0, 0, 0]);
  assert.deepEqual(state.buckets.map(b => b.balance), [4000, 3000, 2000, 1000]);
  deposit(state, 1);
  assert.deepEqual(state.buckets.map(b => b.balance), [4001, 3000, 2000, 1000]);
});
test('small deposits do not allocate rounding remainder to zero-weight buckets', async () => {
  const { updatePolicy } = await import('../src/treasury.js');
  for (let value = 1; value < 100; value++) {
    const state = initialState(); updatePolicy(state, [50, 50, 0, 0]); deposit(state, value);
    assert.equal(state.buckets[2].balance + state.buckets[3].balance, 0);
    assert.equal(state.buckets.reduce((s, b) => s + b.balance, 0), value);
  }
});
test('CSV escapes user content and neutralizes formula prefixes', async () => {
  const { paymentsCSV } = await import('../src/treasury.js');
  const state = initialState(); deposit(state, 100000);
  requestPayment(state, { bucketId: 'development', amount: 100, recipient: wallet, purpose: '=SUM(1,2) "demo"', requester: 'Kivanc' });
  const csv = paymentsCSV(state);
  assert.ok(csv.includes('"\'=SUM(1,2) ""demo"""'));
  assert.ok(csv.includes('"1.00"'));
});

test('cancellation releases funds and cannot be performed by another member', async () => {
  const { cancelPayment, validateState } = await import('../src/treasury.js');
  const state = initialState(); deposit(state, 100000);
  const input = { bucketId: 'development', amount: 30000, recipient: wallet, purpose: 'Build', requester: 'Kivanc' };
  const p = requestPayment(state, input);
  assert.throws(() => cancelPayment(state, p.id, 'Alex'));
  cancelPayment(state, p.id, 'Kivanc');
  assert.throws(() => resolvePayment(state, p.id, 'Alex', true));
  assert.doesNotThrow(() => requestPayment(state, input));
  assert.equal(validateState(state), true);
});
test('saved state validation rejects inconsistent balances, malformed records and duplicate IDs', async () => {
  const { exampleState, validateState } = await import('../src/treasury.js');
  const state = exampleState(); assert.equal(validateState(state), true);
  for (const corrupt of [s => s.buckets[0].balance++, s => s.payments.push(s.payments[0]), s => s.payments[0].amount = -1, s => s.payments[0].recipient = null, s => s.buckets[0].percent = 200, s => s.events.push({}), s => s.payments[0].amount = 9999999]) {
    const copy = structuredClone(state); corrupt(copy); assert.equal(validateState(copy), false);
  }
});
test('zero-address recipients are rejected without reserving any budget', () => {
  const state = initialState(); deposit(state, 100000);
  assert.throws(() => requestPayment(state, { bucketId: 'development', amount: 100, recipient: '0x' + '0'.repeat(40), purpose: 'Build', requester: 'Kivanc' }));
  assert.equal(state.payments.length, 0);
});
