const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  let products = data.products || [];
  let changes = [];

  // Code 3 2XL -> shopStockQty = 1
  const code3 = products.find(p => p.name === 'Code 3');
  const code3_2xl = code3.sizes.find(s => s.size === '2XL');
  if (code3_2xl) {
    code3_2xl.shopStockQty = 1;
    changes.push('Code 3 2XL: 0 -> 1');
  }

  // BRA 40C -> shopStockQty = 1
  const bra = products.find(p => p.name === 'BRA');
  const bra40c = bra.sizes.find(s => s.size === '40C');
  if (bra40c) {
    bra40c.shopStockQty = 1;
    changes.push('BRA 40C: 0 -> 1');
  }

  console.log('--- Changes ---');
  changes.forEach(c => console.log(c));

  const { error } = await supabase.from('inventory_state_v1').update({ products }).eq('id', 1);
  if (error) throw error;
  console.log('Database updated.');
}
run();
