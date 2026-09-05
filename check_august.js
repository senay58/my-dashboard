const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAugust() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const augSales = sales.filter(s => s.date.startsWith('2026-08'));
  console.log('--- August Sales ---');
  augSales.forEach(s => console.log(`${s.date} | ${s.productName} | ${s.size} | Qty: ${s.qty} | Price: ${s.unitPrice} | Total: ${s.total} | Ref: ${s.refNum}`));
}
checkAugust();
