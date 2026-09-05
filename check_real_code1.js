const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStockMap() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  const products = data.products || [];
  const realCode1 = products.find(p => p.id === '46ab0869-d6c3-4416-b38a-172dd2768ef3');
  console.log('Real Code 1 current stock:');
  for (const s of (realCode1.sizes || [])) {
    console.log(`  ${s.size} -> Shop: ${s.shopStockQty}, Main: ${s.mainStockQty}`);
  }
}
checkStockMap();
