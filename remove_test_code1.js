const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const correctCode1Stock = {
  'XL': 4,
  '2XL': 6,
  'L': 10,
  '3XL': 5,
  'M': 3,
  'S': 1,
  '4XL': 1
};

async function fixProducts() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  let products = data.products || [];

  // 1. Remove the test Code 1 product (ID: b8fc5c6c-d346-456e-8c5d-73f2a231aadf)
  const beforeCount = products.length;
  products = products.filter(p => p.id !== 'b8fc5c6c-d346-456e-8c5d-73f2a231aadf');
  console.log(`Removed test product. Count: ${beforeCount} -> ${products.length}`);

  // 2. Update the real Code 1 product (ID: 46ab0869-d6c3-4416-b38a-172dd2768ef3) with admin's shop stock
  const realCode1 = products.find(p => p.id === '46ab0869-d6c3-4416-b38a-172dd2768ef3');
  if (realCode1) {
    for (const s of (realCode1.sizes || [])) {
      if (correctCode1Stock[s.size] !== undefined) {
        console.log(`Real Code 1 Size ${s.size}: Shop ${s.shopStockQty} -> ${correctCode1Stock[s.size]}`);
        s.shopStockQty = correctCode1Stock[s.size];
      }
    }
  }

  const { error } = await supabase.from('inventory_state_v1').update({ products }).eq('id', 1);
  if (error) throw error;
  console.log('Database updated successfully!');
}
fixProducts();
