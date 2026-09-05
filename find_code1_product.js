const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findProduct() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  const products = data.products || [];

  const code1Products = products.filter(p => p.name && p.name.toLowerCase().includes('code 1'));
  console.log('Code 1 matching products:');
  for (const p of code1Products) {
    console.log(`Product: "${p.name}" (ID: ${p.id})`);
    for (const s of (p.sizes || [])) {
      console.log(`  Size: ${s.size} | Price: ${s.price} | ShopStock: ${s.shopStockQty} | MainStock: ${s.mainStockQty} | ID: ${s.id}`);
    }
  }

  // Also check if any product has a size with price 1000 or default price 1000
  console.log('\nAny product with price 1000:');
  for (const p of products) {
    const has1000 = (p.sizes || []).some(s => Number(s.price) === 1000) || Number(p.price) === 1000;
    if (has1000) {
      console.log(`Product: "${p.name}" (ID: ${p.id})`);
      for (const s of (p.sizes || [])) {
        console.log(`  Size: ${s.size} | Price: ${s.price} | ShopStock: ${s.shopStockQty} | MainStock: ${s.mainStockQty} | ID: ${s.id}`);
      }
    }
  }
}
findProduct();
