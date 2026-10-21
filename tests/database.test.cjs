// Integration tests against a DISPOSABLE local PostgreSQL database, never Supabase.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const connection = process.env.JEGNIT_TEST_DATABASE_URL;
const psql = process.env.JEGNIT_PSQL || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261021_safe_inventory.sql'), 'utf8');
const activate = fs.readFileSync(path.join(__dirname, '../supabase/activate-safe-saves.sql'), 'utf8');
const quote = value => "'" + String(value).replaceAll("'", "''") + "'";
const json = value => quote(JSON.stringify(value)) + '::jsonb';

function sql(query) {
  const result = spawnSync(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', connection], { input: query, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result.stdout.trim();
}
function asyncSql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', connection], { windowsHide: true });
    let output = ''; let error = '';
    child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { error += value; });
    child.on('error', reject); child.on('exit', code => code ? reject(new Error(error)) : resolve(output.trim()));
    child.stdin.end(query);
  });
}
const read = () => JSON.parse(sql('SELECT to_jsonb(s) FROM public.inventory_state_v1 s WHERE id=1;'));
const rpcSql = (id = null, revision = -1, state = null) => `SET ROLE anon; SELECT public.inventory_commit_v2(${id ? quote(id) + '::uuid' : 'NULL'}, ${revision}, ${state ? json(state) : 'NULL'});`;
const rpc = (id, revision, state) => JSON.parse(sql(rpcSql(id, revision, state)));

test('real PostgreSQL migration, preservation, receipts, contention, audit and legacy guard', { skip: !connection }, async t => {
  const url = new URL(connection);
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), 'Tests require a disposable localhost database.');
  assert.equal(url.pathname, '/jegnit_regression', 'Tests require the dedicated jegnit_regression database.');
  // Reset ONLY the asserted disposable database. This can never target Supabase.
  sql('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC;');
  sql(`DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; END $$;
    CREATE TABLE public.inventory_state_v1 (id bigint PRIMARY KEY, products jsonb, sales jsonb, replacements jsonb, transfers jsonb, updated_at timestamptz DEFAULT now());
    ALTER TABLE public.inventory_state_v1 ENABLE ROW LEVEL SECURITY;
    CREATE POLICY existing_access ON public.inventory_state_v1 TO anon, authenticated USING (true) WITH CHECK (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_state_v1 TO anon, authenticated;`);
  const backupDir = path.join(__dirname, '../../backups');
  const filename = fs.readdirSync(backupDir).filter(n => n.endsWith('.json')).sort()[0];
  assert.ok(filename, 'Create a read-only snapshot before migration verification.');
  const original = JSON.parse(fs.readFileSync(path.join(backupDir, filename), 'utf8')).data;
  sql(`INSERT INTO public.inventory_state_v1 (id,products,sales,replacements,transfers,updated_at) VALUES (1,${json(original.products)},${json(original.sales)},${json(original.replacements)},${json(original.transfers)},${quote(original.updated_at)});`);

  await t.test('install and rerun migration preserve every business field and initial history', () => {
    const before = read(); sql(migration); sql(migration);
    const after = read(); delete after.revision;
    assert.deepEqual(after, before);
    assert.equal(Number(sql('SELECT count(*) FROM public.inventory_state_history_v2;')), 1);
    assert.equal(rpc().status, 'ready');
  });
  const id = randomUUID();
  await t.test('sale and stock commit atomically, receipt deduplicates retry', async () => {
    const { applyInventoryAction } = await import('../src/inventory/actions.mjs');
    const state = read();
    const product = state.products.find(p => (p.sizes || []).some(s => Number(s.shopStockQty) > 0));
    const size = product.sizes.find(s => Number(s.shopStockQty) > 0);
    const next = applyInventoryAction(state, { id, action: 'recordSale', createdAt: '2026-10-21T11:00:00Z', args: [{ date: '2026-10-19', productId: product.id, sizeId: size.id, qty: 1, paymentMethod: 'Cash', deliveryType: 'Pickup' }] });
    assert.equal(rpc(id, state.revision, next).status, 'committed');
    assert.equal(read().sales.length, original.sales.length + 1);
    assert.equal(read().products.find(p => p.id === product.id).sizes.find(s => s.id === size.id).shopStockQty, size.shopStockQty - 1);
    assert.equal(rpc(id, state.revision, next).status, 'duplicate');
    assert.equal(rpc(id).status, 'duplicate');
    assert.equal(read().sales.length, original.sales.length + 1);
  });
  await t.test('stale revision is rejected without changing any record', () => {
    const before = read();
    assert.equal(rpc(randomUUID(), 0, before).status, 'conflict');
    assert.deepEqual(read(), before);
  });
  await t.test('simultaneous writers at the same revision cannot both overwrite', async () => {
    const before = read();
    const results = await Promise.all([asyncSql(rpcSql(randomUUID(), before.revision, before)), asyncSql(rpcSql(randomUUID(), before.revision, before))]);
    assert.deepEqual(results.map(v => JSON.parse(v).status).sort(), ['committed', 'conflict']);
    assert.equal(read().revision, before.revision + 1);
  });
  await t.test('legacy date filtering cannot remove any existing sale during rollout', () => {
    const before = read();
    sql("SET ROLE anon; UPDATE public.inventory_state_v1 SET sales='[]'::jsonb WHERE id=1;");
    assert.deepEqual(read().sales, before.sales);
    assert.deepEqual(read().products, before.products);
  });
  await t.test('ordinary legacy update remains available during transition and is audited', () => {
    const before = read();
    sql('SET ROLE anon; UPDATE public.inventory_state_v1 SET products=products WHERE id=1;');
    assert.equal(read().revision, before.revision + 1);
  });
  await t.test('phase two rejects old browser upserts and deletes, accepts v2 saves', () => {
    sql(activate); const before = read();
    assert.throws(() => sql('SET ROLE anon; UPDATE public.inventory_state_v1 SET products=products WHERE id=1;'), /older version/);
    assert.throws(() => sql(`SET ROLE anon; INSERT INTO public.inventory_state_v1(id,products,sales,replacements,transfers) VALUES (1,${json(before.products)},${json(before.sales)},${json(before.replacements)},${json(before.transfers)}) ON CONFLICT(id) DO UPDATE SET products=EXCLUDED.products;`), /older version/);
    assert.throws(() => sql('SET ROLE anon; DELETE FROM public.inventory_state_v1 WHERE id=1;'), /Deleting live inventory/);
    assert.equal(rpc(randomUUID(), before.revision, before).status, 'committed');
    const next = read();
    assert.throws(() => rpc(randomUUID(), next.revision, { ...next, sales: [] }), /remove existing sales/);
  });
  await t.test('incomplete payload rolls back and clients cannot edit receipts or snapshots', () => {
    const before = read();
    assert.throws(() => rpc(randomUUID(), before.revision, {}), /Incomplete inventory/);
    assert.deepEqual(read(), before);
    assert.throws(() => sql("SET ROLE anon; DELETE FROM public.inventory_mutations_v2;"), /permission denied/);
    assert.throws(() => sql("SET ROLE anon; SELECT * FROM public.inventory_state_history_v2;"), /permission denied/);
    assert.throws(() => sql("SET ROLE anon; UPDATE public.inventory_sync_control_v2 SET enforce_v2=false;"), /permission denied/);
    assert.equal(Number(sql('SELECT count(*) FROM public.inventory_state_history_v2;')), read().revision + 1);
  });
  await t.test('current RLS denial remains denial through the new RPC', () => {
    sql('DROP POLICY existing_access ON public.inventory_state_v1;');
    assert.throws(() => rpc(), /missing or inaccessible/);
    sql('CREATE POLICY existing_access ON public.inventory_state_v1 TO anon, authenticated USING (true) WITH CHECK (true);');
  });
});
