const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  const products = data.products || [];

  // Check Code 3 for 2XL
  const code3 = products.find(p => p.name === 'Code 3');
  console.log('Code 3 sizes:', (code3.sizes || []).map(s => s.size));

  // Check BRA for 40C and 36C
  const bra = products.find(p => p.name === 'BRA');
  console.log('BRA sizes:', (bra.sizes || []).map(s => s.size));

  // Check Code 10 for XL
  const code10 = products.find(p => p.name === 'Code 10');
  console.log('Code 10 sizes:', (code10.sizes || []).map(s => `${s.size}: ${s.shopStockQty}`));
}
run();
