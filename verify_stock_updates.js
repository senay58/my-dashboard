const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verify() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  const products = data.products || [];

  const targets = ['Code 3', 'BRA', 'Code 10', 'CATHRINE TEA'];
  for (const name of targets) {
    const p = products.find(prod => prod.name === name);
    if (!p) continue;
    console.log(`\n=== ${p.name} ===`);
    for (const s of (p.sizes || [])) {
      console.log(`  ${s.size} -> Shop: ${s.shopStockQty}, Main: ${s.mainStockQty}`);
    }
  }
}
verify();
