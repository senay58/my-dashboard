const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  const products = data.products || [];
  for (const p of products) {
    console.log(`\n=== ${p.name} (id: ${p.id}) ===`);
    for (const s of (p.sizes || [])) {
      console.log(`  ${s.size} => shopStockQty: ${s.shopStockQty}, mainStockQty: ${s.mainStockQty} (sizeId: ${s.id})`);
    }
  }
}
run();
