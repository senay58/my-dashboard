// Read-only: never changes the database. Raw snapshots must not be committed.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase configuration is missing.');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from('inventory_state_v1').select('*').eq('id', 1).single();
  if (error) throw error;
  const directory = path.resolve(__dirname, '../../backups');
  fs.mkdirSync(directory, { recursive: true });
  const timestamp = new Date().toISOString();
  const filename = path.join(directory, `inventory-${timestamp.replace(/[:.]/g, '-')}.json`);
  const snapshot = { capturedAt: timestamp, sourceHost: new URL(url).host, table: 'inventory_state_v1', data };
  const raw = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(filename, raw, { flag: 'wx' });
  const sha256 = crypto.createHash('sha256').update(raw).digest('hex');
  fs.writeFileSync(`${filename}.sha256`, `${sha256}\n`, { flag: 'wx' });
  const sales = data.sales || [];
  const days = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-10-18', '2026-10-19', '2026-10-20'];
  console.log(JSON.stringify({ filename, sha256, counts: Object.fromEntries(['products', 'sales', 'replacements', 'transfers'].map(k => [k, (data[k] || []).length])), dates: days.map(date => ({ date, count: sales.filter(s => s.date === date).length, total: sales.filter(s => s.date === date && s.status !== 'returned').reduce((sum, s) => sum + Number(s.total || 0), 0) })), revision: data.revision ?? null }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
