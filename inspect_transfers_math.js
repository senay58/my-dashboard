const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectHistory() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const products = data.products || [];

  // Let us check Sept 15 transferred products
  // 1. Code 1 M: transfer qty 12. Main was 75 on Sept 5.
  // 2. Code 1 XL: transfer qty 7. Main was 68 on Sept 5.
  // 3. Code 7 M: transfer qty 4. Main was 45 on Sept 5.
  // 4. Code 7 XL: transfer qty 8. Main was 40 on Sept 5.
  // 5. Code 401 XS/S: transfer qty 5. Main was 10 on Sept 5.
  // 6. Code 13B M: transfer qty 8. Main was 55 on Sept 5.
  // 7. BRA 36D: transfer qty 3. Main was 15 on Sept 5.
  // 8. BRA 36C: transfer qty 2. Main was 9 on Sept 5.
  // 9. BRA 38C: transfer qty 2. Main was 40 on Sept 5.

  const items = [
    { p: 'Code 1', s: 'M', transferQty: 12 },
    { p: 'Code 1', s: 'XL', transferQty: 7 },
    { p: 'Code 7', s: 'M', transferQty: 4 },
    { p: 'Code 7', s: 'XL', transferQty: 8 },
    { p: 'Code 401', s: 'XS/S', transferQty: 5 },
    { p: 'Code 13B', s: 'M', transferQty: 8 },
    { p: 'BRA', s: '36D', transferQty: 3 },
    { p: 'BRA', s: '36C', transferQty: 2 },
    { p: 'BRA', s: '38C', transferQty: 2 },
  ];

  console.log("Current stock vs transfers:");
  items.forEach(it => {
    const prod = products.find(p => p.name === it.p);
    const sz = (prod?.sizes || []).find(s => s.size === it.s);
    console.log(`${it.p} (${it.s}): Main=${sz?.mainStockQty}, Shop=${sz?.shopStockQty} (transferred: ${it.transferQty})`);
  });
}
inspectHistory();
