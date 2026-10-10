const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findSept19Sales() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const sept19 = sales.filter(s => s.date === '2026-09-19');
  console.log(`Found ${sept19.length} sales with date 2026-09-19 in Supabase:`);
  sept19.forEach(s => {
    console.log(`  ID: ${s.id} | ${s.date} | ${s.productName} (${s.size}) | Qty: ${s.qty} | Price: ${s.unitPrice} | Total: ${s.total} | Ref: ${s.refNum || 'none'} | Payment: ${s.paymentMethod}`);
  });
}
findSept19Sales();
