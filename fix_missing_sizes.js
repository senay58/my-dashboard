const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const createId = () => crypto.randomUUID();

// All sizes the admin listed per product (by product ID)
const listedSizes = {
  'b8fc5c6c-d346-456e-8c5d-73f2a231aadf': ['XL','2XL','L','3XL','M','S','4XL'],       // Code 1
  'b968a0d2-8721-4e93-9676-865b8da3fa3c': ['XS','L','XL','S','M'],                     // Code 2
  '5740c198-79af-4060-9b7c-3876a4cceb86': ['3XL','XL','2XL'],                          // Code 3
  'ffe04708-2a43-46c9-949e-75953f7eaea0': ['M','6XL','S'],                             // Code 5
  'cb686fa9-30cc-4d20-acbd-2827ac676d1f': ['5XL','4XL','6XL','XL','L','M','S','2XL'],  // Code 6
  '870aef28-4382-433b-a480-174f01bff51a': ['L','3XL','2XL','XL','M'],                  // Code 7
  '01fa299f-654f-444f-a025-0010d3d7344e': ['M','L','XL','2XL','3XL'],                  // Code 9
  'e9ac9c58-3527-4f64-b27f-9b257a275be3': ['3XL','2XL'],                               // Code 10
  'feb553eb-c65f-437f-8ac8-af6f441cc472': ['2XL','XL','3XL'],                          // Code 11
  '4681471e-9a49-4e7e-b8fb-6e0969cc419d': ['XXS','XS'],                                // Code 12
  'ee10850a-9d92-4e5e-8233-df93f910039a': ['3XL','2XL','XS'],                          // Code 13
  '2a67b87d-7703-488b-8be2-7bd60aa12931': ['S','M','XL','XS','2XL','L'],               // Code 13B
  'ecbdd06b-b968-46d2-8d35-ff6f227cf2b6': ['36D','38C','38B','38D','40E','40D','42C','42B','42D','42E','44D','40C'], // BRA
  '61e9d56c-5063-4931-9e70-3a94e0c87a94': ['1.2 cm'],                                  // SILICONE PANT
  '5f8ef6db-1fef-444e-b798-70d43e081355': ['1.65 cm','2.0 cm','2.2 cm'],               // SILICONE
  '3875b42c-6d1a-4289-abcd-2abdde809ad8': ['XL/2XL','M/L','XS/S'],                     // Code 401
  '08681cbb-377f-4dfb-a68f-9502ec4bb9f4': ['XS/S','M/L','XL/2XL'],                     // Code 402
  '50a230ac-09f1-46dd-9aeb-5cb8f0dc52cc': ['S','M','L','XL','2XL'],                    // Code 2A
  'fa4a8323-bce0-45ab-a045-8335e4f4b16c': ['3XL','5XL','4XL','6XL'],                   // MALE SPORT
};

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  let products = data.products || [];
  let changes = [];

  for (const product of products) {
    const listed = listedSizes[product.id];
    if (!listed) {
      // Product not listed by admin — special cases
      if (product.name === 'CATHRINE TEA') {
        for (const s of product.sizes || []) {
          if (Number(s.shopStockQty || 0) !== 10) {
            changes.push(`${product.name} ${s.size}: ${s.shopStockQty} -> 10`);
            s.shopStockQty = 10;
          }
        }
      }
      continue;
    }

    const listedSet = new Set(listed);

    // Zero out any sizes NOT in the admin's list (shop stock only)
    for (const s of product.sizes || []) {
      if (!listedSet.has(s.size) && Number(s.shopStockQty || 0) !== 0) {
        changes.push(`${product.name} ${s.size}: ${s.shopStockQty} -> 0 (not listed)`);
        s.shopStockQty = 0;
      }
    }

    // Create missing sizes that are in the admin list but not in the system
    const existingSizes = new Set((product.sizes || []).map(s => s.size));
    for (const sizeName of listed) {
      if (!existingSizes.has(sizeName)) {
        // Need to create this size
        const newSize = {
          id: createId(),
          size: sizeName,
          price: 0,
          shopStockQty: 0,
          mainStockQty: 0,
        };
        if (!product.sizes) product.sizes = [];
        product.sizes.push(newSize);
        changes.push(`${product.name} ${sizeName}: CREATED (new size)`);
      }
    }
  }

  console.log('--- Changes ---');
  changes.forEach(c => console.log(c));
  console.log(`\nTotal changes: ${changes.length}`);

  const { error } = await supabase.from('inventory_state_v1').update({ products }).eq('id', 1);
  if (error) throw error;
  console.log('Database updated successfully.');
}
run();
