const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function updateDb() {
  const { data, error } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  if (error) throw error;
  let products = data.products || [];

  // 1. BRA 40C price -> 7000
  const bra = products.find(p => p.name === 'BRA');
  if (bra) {
    const s40c = (bra.sizes || []).find(s => s.size === '40C');
    if (s40c) {
      console.log(`BRA 40C price: ${s40c.price} -> 7000`);
      s40c.price = 7000;
    }
  }

  // 2. Code 7 2XL -> add 3 pcs to shop stock
  const c7 = products.find(p => p.name === 'Code 7');
  if (c7) {
    const s2xl = (c7.sizes || []).find(s => s.size === '2XL');
    if (s2xl) {
      const oldQty = Number(s2xl.shopStockQty || 0);
      s2xl.shopStockQty = oldQty + 3;
      console.log(`Code 7 2XL shopStockQty: ${oldQty} -> ${s2xl.shopStockQty} (+3 pcs)`);
    }
  }

  const { error: updateError } = await supabase.from('inventory_state_v1').update({ products }).eq('id', 1);
  if (updateError) throw updateError;
  console.log('Database updated successfully!');
}
updateDb();
