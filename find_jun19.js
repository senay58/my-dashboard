const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  const jun19 = sales.filter(s => s.date === '2026-06-19' && s.productName === 'Code 1');
  console.log('June 19 Code 1 records:', jun19);
}
run();
