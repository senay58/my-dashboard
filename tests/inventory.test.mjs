import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInventoryAction } from '../src/inventory/actions.mjs';
import { businessDate } from '../src/inventory/dates.mjs';
import { createInventoryStore, LEGACY_KEY, CACHE_KEY, OUTBOX_PREFIX } from '../src/inventory/store.mjs';

export const fixture = (stock = 5) => ({
  revision: 0, products: [{ id: 'p', name: 'Code 7', sizes: [
    { id: 's', size: 'M', price: 12000, mainStockQty: 10, shopStockQty: stock },
    { id: 'l', size: 'L', price: 13000, mainStockQty: 5, shopStockQty: 5 },
  ] }], sales: [], replacements: [], transfers: [],
});
export const sale = date => ({ date, productId: 'p', sizeId: 's', qty: 1, paymentMethod: 'Cash', deliveryType: 'Pickup', refNum: '' });
export const command = (action, args, id = crypto.randomUUID()) => ({ id, createdAt: '2026-10-21T11:00:00Z', action, args });

export function memoryStorage() {
  const map = new Map();
  return { get length() { return map.size; }, key: i => [...map.keys()][i] ?? null,
    getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) };
}

function server(initial = fixture()) {
  let state = structuredClone(initial);
  const receipts = new Set();
  let offline = false;
  let lost = false;
  let conflicts = 0;
  const client = { rpc: async (_name, { p_mutation_id: id, p_expected_revision: revision, p_state: next }) => {
    await new Promise(resolve => setTimeout(resolve, 1));
    if (offline) return { error: { message: 'Connection unavailable' } };
    if (receipts.has(id)) return { data: { status: 'duplicate', state: structuredClone(state) } };
    if (next === null) return { data: { status: 'ready', state: structuredClone(state) } };
    if (revision !== state.revision) { conflicts++; return { data: { status: 'conflict', state: structuredClone(state) } }; }
    state = { ...structuredClone(next), revision: state.revision + 1 };
    receipts.add(id);
    if (lost) { lost = false; return { error: { message: 'Response lost after commit' } }; }
    return { data: { status: 'committed', state: structuredClone(state) } };
  } };
  return { client, state: () => state, conflicts: () => conflicts,
    offline: value => { offline = value; }, loseNextResponse: () => { lost = true; } };
}

test('sales on September/October 19 and earlier dates are retained with stock', () => {
  let state = fixture();
  for (const date of ['2026-09-19', '2026-10-19', '2026-05-19']) state = applyInventoryAction(state, command('recordSale', [sale(date)]));
  assert.deepEqual(state.sales.map(s => s.date), ['2026-09-19', '2026-10-19', '2026-05-19']);
  assert.equal(state.products[0].sizes[0].shopStockQty, 2);
});

test('Addis Ababa business date changes at 21:00 UTC', () => {
  assert.equal(businessDate('2026-10-18T21:30:00Z'), '2026-10-19');
  assert.equal(businessDate('2026-10-18T20:59:00Z'), '2026-10-18');
});

test('invalid sale leaves input state untouched', () => {
  const state = fixture();
  for (const patch of [{ qty: 1.5 }, { qty: 6 }, { qty: Infinity }, { date: '2026-02-30' }, { paymentMethod: 'CBE', refNum: '' }]) {
    assert.throws(() => applyInventoryAction(state, command('recordSale', [{ ...sale('2026-10-19'), ...patch }])));
    assert.equal(state.sales.length, 0);
    assert.equal(state.products[0].sizes[0].shopStockQty, 5);
  }
});

test('same-product partial exchange balances stock and retains unreturned quantity', () => {
  const state = fixture();
  state.sales.push({ id: 'original', ...sale('2026-10-19'), productName: 'Code 7', size: 'M', qty: 2, total: 24000, unitPrice: 12000 });
  const next = applyInventoryAction(state, command('recordMultiReplacement', [{ saleId: 'original', returnQty: 1, exchangeItems: [{ productId: 'p', sizeId: 'l', qty: 1 }] }]));
  assert.equal(next.products[0].sizes[0].shopStockQty, 6);
  assert.equal(next.products[0].sizes[1].shopStockQty, 4);
  assert.equal(next.sales[0].qty, 1);
  assert.equal(next.sales[0].total, 12000);
  assert.notEqual(next.sales[0].status, 'returned');
});

test('duplicate exchange sizes cannot oversell; returned sales cannot be returned twice', () => {
  const state = fixture();
  state.sales.push({ id: 'original', ...sale('2026-10-19'), qty: 1, total: 12000, unitPrice: 12000 });
  const args = { saleId: 'original', returnQty: 1, exchangeItems: [{ productId: 'p', sizeId: 'l', qty: 3 }, { productId: 'p', sizeId: 'l', qty: 3 }] };
  assert.throws(() => applyInventoryAction(state, command('recordMultiReplacement', [args])), /combined/);
  state.sales[0].status = 'returned';
  assert.throws(() => applyInventoryAction(state, command('recordMultiReplacement', [{ ...args, exchangeItems: [args.exchangeItems[0]] }])), /already been returned/);
});

test('startup/realtime refresh never writes inventory or uploads legacy cache', async () => {
  const remote = server();
  const storage = memoryStorage();
  const legacy = fixture();
  legacy.sales.push({ id: 'old-removed-record', date: '2026-09-19' });
  storage.setItem(LEGACY_KEY, JSON.stringify(legacy));
  const store = createInventoryStore({ client: remote.client, storage });
  await store.sync(); await store.sync();
  assert.equal(remote.state().revision, 0);
  assert.equal(store.getSnapshot().sales.length, 0);
  assert.equal(storage.getItem(LEGACY_KEY), JSON.stringify(legacy));
  assert.ok(store.exportDeviceData().deviceData[LEGACY_KEY]);
});

test('two devices retry contention and preserve both sales and stock deductions', async () => {
  const remote = server();
  const a = createInventoryStore({ client: remote.client, storage: memoryStorage() });
  const b = createInventoryStore({ client: remote.client, storage: memoryStorage() });
  await Promise.all([a.sync(), b.sync()]);
  const receipts = await Promise.all([a.submit('recordSale', [sale('2026-10-19')]), b.submit('recordSale', [sale('2026-10-19')])]);
  assert.ok(receipts.every(r => r.status === 'confirmed'));
  assert.equal(remote.state().sales.length, 2);
  assert.equal(remote.state().products[0].sizes[0].shopStockQty, 3);
  assert.ok(remote.conflicts() >= 1);
});

test('competing for the last item retains rejected evidence without overselling', async () => {
  const remote = server(fixture(1));
  const a = createInventoryStore({ client: remote.client, storage: memoryStorage() });
  const b = createInventoryStore({ client: remote.client, storage: memoryStorage() });
  await Promise.all([a.sync(), b.sync()]);
  const receipts = await Promise.all([a.submit('recordSale', [sale('2026-10-19')]), b.submit('recordSale', [sale('2026-10-19')])]);
  assert.deepEqual(receipts.map(r => r.status).sort(), ['confirmed', 'rejected']);
  assert.equal(remote.state().sales.length, 1);
  assert.equal(remote.state().products[0].sizes[0].shopStockQty, 0);
  assert.equal(a.getSnapshot().rejectedCount + b.getSnapshot().rejectedCount, 1);
});

test('network failure survives reload and retry records the sale exactly once', async () => {
  const remote = server(); const storage = memoryStorage();
  const a = createInventoryStore({ client: remote.client, storage });
  await a.sync(); remote.offline(true);
  const receipt = await a.submit('recordSale', [sale('2026-10-19')]);
  assert.equal(receipt.status, 'pending');
  assert.equal(a.getSnapshot().sales.length, 0);
  assert.ok(storage.getItem(OUTBOX_PREFIX + receipt.id));
  const b = createInventoryStore({ client: remote.client, storage });
  remote.offline(false); await b.sync(); await b.sync();
  assert.equal(remote.state().sales.length, 1);
  assert.equal(remote.state().products[0].sizes[0].shopStockQty, 4);
  assert.equal(b.getSnapshot().pendingCount, 0);
});

test('lost commit response is deduplicated before replay, even at zero stock', async () => {
  const remote = server(fixture(1)); const storage = memoryStorage();
  const a = createInventoryStore({ client: remote.client, storage });
  await a.sync(); remote.loseNextResponse();
  assert.equal((await a.submit('recordSale', [sale('2026-10-19')])).status, 'pending');
  const b = createInventoryStore({ client: remote.client, storage });
  await b.sync();
  assert.equal(remote.state().sales.length, 1);
  assert.equal(remote.state().products[0].sizes[0].shopStockQty, 0);
  assert.equal(b.getSnapshot().pendingCount, 0);
  assert.equal(b.getSnapshot().rejectedCount, 0);
});

test('storage failure prevents mutation and cloud acknowledgement', async () => {
  const remote = server(); const storage = memoryStorage();
  const a = createInventoryStore({ client: remote.client, storage });
  await a.sync(); const originalSet = storage.setItem;
  storage.setItem = (key, value) => { if (key.startsWith(OUTBOX_PREFIX)) throw new Error('Quota exceeded'); originalSet(key, value); };
  await assert.rejects(a.submit('recordSale', [sale('2026-10-19')]), /Quota/);
  assert.equal(remote.state().sales.length, 0);
});

test('no migration or inaccessible database never shows cloud synced or accepts new sales', async () => {
  const storage = memoryStorage(); storage.setItem(LEGACY_KEY, JSON.stringify(fixture()));
  const store = createInventoryStore({ client: { rpc: async () => ({ error: { code: 'PGRST202' } }) }, storage });
  await store.sync();
  assert.equal(store.getSnapshot().ready, false);
  assert.match(store.getSnapshot().syncError, /database update/);
  await assert.rejects(store.submit('recordSale', [sale('2026-10-19')]), /Wait for/);
  assert.equal(storage.getItem(CACHE_KEY), null);
});

test('tabs sharing a durable command do not apply it twice', async () => {
  const remote = server(); const storage = memoryStorage();
  const a = createInventoryStore({ client: remote.client, storage });
  const b = createInventoryStore({ client: remote.client, storage });
  await Promise.all([a.sync(), b.sync()]);
  const saving = a.submit('recordSale', [sale('2026-10-19')]);
  await b.sync(); await saving; await a.sync();
  assert.equal(remote.state().sales.length, 1);
  assert.equal(remote.state().products[0].sizes[0].shopStockQty, 4);
  assert.equal(a.getSnapshot().pendingCount, 0);
});

test('storage failure after server commit preserves the command until acknowledgement is durable', async () => {
  const remote = server(); const storage = memoryStorage();
  const a = createInventoryStore({ client: remote.client, storage }); await a.sync();
  const originalSet = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === CACHE_KEY && remote.state().revision > 0) throw new Error('Cache quota exceeded');
    originalSet(key, value);
  };
  const receipt = await a.submit('recordSale', [sale('2026-10-19')]);
  assert.equal(receipt.status, 'pending'); assert.equal(remote.state().sales.length, 1);
  assert.ok(storage.getItem(OUTBOX_PREFIX + receipt.id));
  storage.setItem = originalSet; await a.sync();
  assert.equal(remote.state().sales.length, 1); assert.equal(a.getSnapshot().pendingCount, 0);
});

test('an edit opened before a concurrent sale cannot reset its stock deduction', () => {
  const original = fixture();
  const editedSize = original.products[0].sizes[0];
  const latest = applyInventoryAction(original, command('recordSale', [sale('2026-10-19')]));
  const edit = command('updateProductSize', [{ productId: 'p', sizeId: 's', name: 'Code 7', size: 'M', price: 12000, mainStockQty: 10, shopStockQty: 5 }]);
  edit.expectedSize = editedSize;
  assert.throws(() => applyInventoryAction(latest, edit), /changed on another device/);
  assert.equal(latest.products[0].sizes[0].shopStockQty, 4);
});

test('transfer request and receipt update stock once and retain transfer history', () => {
  const requested = applyInventoryAction(fixture(), command('requestTransfer', [{ productId: 'p', sizeId: 's', qty: 2 }]));
  assert.equal(requested.products[0].sizes[0].mainStockQty, 8);
  assert.equal(requested.products[0].sizes[0].shopStockQty, 5);
  const confirmed = applyInventoryAction(requested, command('confirmTransfer', [requested.transfers[0].id]));
  assert.equal(confirmed.products[0].sizes[0].shopStockQty, 7);
  assert.equal(confirmed.transfers[0].status, 'confirmed');
  assert.throws(() => applyInventoryAction(confirmed, command('confirmTransfer', [confirmed.transfers[0].id])), /already confirmed/);
});
