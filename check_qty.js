const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const zeroQtySales = sales.filter(s => Number(s.qty) === 0);
  console.log('--- Sales with Qty 0 ---');
  zeroQtySales.forEach(s => console.log(`${s.date} | ${s.productName} | ${s.size} | Qty: ${s.qty} | Total: ${s.total}`));
  
  const juneSales = sales.filter(s => s.date.startsWith('2026-06'));
  let qtySum = 0;
  juneSales.forEach(s => qtySum += (Number(s.qty) || 0));
  console.log('\n--- June Sales ---');
  console.log(`Total June Qty: ${qtySum}`);
  console.log(`Total June Sales Count: ${juneSales.length}`);
}
check();
