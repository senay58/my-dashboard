const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  let sales = data.sales || [];
  const before = sales.length;

  // Delete SILICONE PANT Aug 3 and Jun 19 Code 1 test
  const killIds = new Set([
    'ef356166-867b-496c-8b8e-ab854133a91b',
    'ff1be5db-059d-4607-8287-f71f6f2551bf'
  ]);
  sales = sales.filter(s => !killIds.has(s.id));
  console.log('Removed', before - sales.length, 'records.');

  // Verify August total
  let augTotal = 0;
  for (const s of sales) {
    if (s.date.startsWith('2026-08')) augTotal += Number(s.total) || 0;
  }
  console.log('August Total:', augTotal);

  // Verify June total
  let junTotal = 0;
  for (const s of sales) {
    if (s.date.startsWith('2026-06')) junTotal += Number(s.total) || 0;
  }
  console.log('June Total:', junTotal);

  const { error } = await supabase.from('inventory_state_v1').update({ sales }).eq('id', 1);
  if (error) throw error;
  console.log('DB updated.');
}
fix();
