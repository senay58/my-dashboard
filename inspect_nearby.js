const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectNearby() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const midSept = sales.filter(s => s.date >= '2026-09-17' && s.date <= '2026-09-22');
  console.log(`Sales between Sept 17 and Sept 22 (${midSept.length} found):`);
  midSept.forEach(s => {
    console.log(`  ${s.date} | ${s.productName} (${s.size}) | Qty: ${s.qty} | Total: ${s.total} | Ref: ${s.refNum || 'none'}`);
  });
}
inspectNearby();
