const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectSeptember() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const transfers = (data.transfers || []).filter(t => t.date && t.date.startsWith('2026-09'));
  console.log('September Transfers:');
  transfers.forEach(t => {
    console.log(`[${t.status}] ${t.date} ${t.createdAt} | ${t.productName} ${t.size} | qty: ${t.qty} | confirmedAt: ${t.confirmedAt}`);
  });

  const sales = (data.sales || []).filter(s => s.date && s.date.startsWith('2026-09'));
  console.log(`\nSeptember Sales count: ${sales.length}`);
  sales.forEach(s => {
    console.log(`  ${s.date} | ${s.productName} ${s.size} | qty: ${s.qty} | total: ${s.total}`);
  });
}
inspectSeptember();
