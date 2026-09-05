const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Admin's correct shop stock counts
const correctStock = {
  // Code 1
  'b8fc5c6c-d346-456e-8c5d-73f2a231aadf': { 'XL': 4, '2XL': 6, 'L': 10, '3XL': 5, 'M': 3, 'S': 1, '4XL': 1 },
  // Code 2
  'b968a0d2-8721-4e93-9676-865b8da3fa3c': { 'XS': 5, 'L': 7, 'XL': 3, 'S': 4, 'M': 3 },
  // Code 3
  '5740c198-79af-4060-9b7c-3876a4cceb86': { '3XL': 4, 'XL': 1, '2XL': 1 },
  // Code 5
  'ffe04708-2a43-46c9-949e-75953f7eaea0': { 'M': 3, '6XL': 1, 'S': 2 },
  // Code 6
  'cb686fa9-30cc-4d20-acbd-2827ac676d1f': { '5XL': 8, '4XL': 6, '6XL': 3, 'XL': 6, 'L': 3, 'M': 4, 'S': 8, '2XL': 3 },
  // Code 7
  '870aef28-4382-433b-a480-174f01bff51a': { 'L': 9, '3XL': 3, '2XL': 2, 'XL': 3, 'M': 2 },
  // Code 9
  '01fa299f-654f-444f-a025-0010d3d7344e': { 'M': 3, 'L': 10, 'XL': 21, '2XL': 19, '3XL': 10 },
  // Code 10
  'e9ac9c58-3527-4f64-b27f-9b257a275be3': { '3XL': 7, '2XL': 5 },
  // Code 11
  'feb553eb-c65f-437f-8ac8-af6f441cc472': { '2XL': 3, 'XL': 10, '3XL': 2 },
  // Code 12
  '4681471e-9a49-4e7e-b8fb-6e0969cc419d': { 'XXS': 8, 'XS': 2 },
  // Code 13
  'ee10850a-9d92-4e5e-8233-df93f910039a': { '3XL': 4, '2XL': 3, 'XS': 5 },
  // Code 13B
  '2a67b87d-7703-488b-8be2-7bd60aa12931': { 'S': 1, 'M': 4, 'XL': 5, 'XS': 10, '2XL': 7, 'L': 7 },
  // BRA
  'ecbdd06b-b968-46d2-8d35-ff6f227cf2b6': { '36D': 3, '38C': 4, '38B': 5, '38D': 8, '40E': 5, '40D': 5, '42C': 5, '42B': 11, '42D': 7, '42E': 12, '44D': 1, '40C': 1 },
  // SILICONE PANT
  '61e9d56c-5063-4931-9e70-3a94e0c87a94': { '1.2 cm': 3 },
  // SILICONE
  '5f8ef6db-1fef-444e-b798-70d43e081355': { '1.65 cm': 3, '2.0 cm': 3, '2.2 cm': 1 },
  // Code 401
  '3875b42c-6d1a-4289-abcd-2abdde809ad8': { 'XL/2XL': 8, 'M/L': 10, 'XS/S': 2 },
  // Code 402
  '08681cbb-377f-4dfb-a68f-9502ec4bb9f4': { 'XS/S': 4, 'M/L': 10, 'XL/2XL': 5 },
  // Code 2A
  '50a230ac-09f1-46dd-9aeb-5cb8f0dc52cc': { 'S': 10, 'M': 9, 'L': 9, 'XL': 9, '2XL': 5 },
  // MALE SPORT
  'fa4a8323-bce0-45ab-a045-8335e4f4b16c': { '3XL': 3, '5XL': 3, '4XL': 1, '6XL': 1 },
};

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('products').eq('id', 1).single();
  let products = data.products || [];
  let changes = [];

  for (const product of products) {
    const stockMap = correctStock[product.id];
    if (!stockMap) continue;

    for (const sizeRow of product.sizes || []) {
      if (stockMap[sizeRow.size] !== undefined) {
        const oldVal = Number(sizeRow.shopStockQty || 0);
        const newVal = stockMap[sizeRow.size];
        if (oldVal !== newVal) {
          changes.push(`${product.name} ${sizeRow.size}: ${oldVal} -> ${newVal}`);
          sizeRow.shopStockQty = newVal;
        }
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
