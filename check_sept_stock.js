const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRecentChanges() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const products = data.products || [];
  
  // Let's inspect products involved in the Sept 15 transfers:
  // Code 1 (M), Code 1 (XL), Code 7 (M), Code 7 (XL), Code 401 (XS/S), Code 13B (M), BRA (36D), BRA (36C), BRA (38C)
  const names = ['Code 1', 'Code 7', 'Code 401', 'Code 13B', 'BRA'];
  names.forEach(name => {
    const p = products.find(prod => prod.name === name);
    if (!p) return;
    console.log(`\n=== ${p.name} ===`);
    (p.sizes || []).forEach(s => {
      console.log(`  ${s.size} -> Main: ${s.mainStockQty}, Shop: ${s.shopStockQty}`);
    });
  });
}
checkRecentChanges();
