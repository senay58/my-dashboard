const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  const { data, error } = await supabase.from('inventory_state_v1').select('products, sales').eq('id', 1).single();
  if (error) {
    console.error(error);
    return;
  }

  // Check BRA 40C
  const bra = (data.products || []).find(p => p.name === 'BRA');
  if (bra) {
    const s40c = (bra.sizes || []).find(s => s.size === '40C');
    console.log('BRA 40C:', s40c);
  }

  // Check Code 7 2XL
  const c7 = (data.products || []).find(p => p.name === 'Code 7');
  if (c7) {
    const s2xl = (c7.sizes || []).find(s => s.size === '2XL');
    console.log('Code 7 2XL:', s2xl);
  }

  // Check sales between 2026-08-03 and 2026-08-12
  const sales = data.sales || [];
  const augSales = sales.filter(s => s.date && s.date.startsWith('2026-08'));
  const dates = [...new Set(augSales.map(s => s.date))].sort();
  console.log('August dates in sales DB:', dates);
  const midAugSales = sales.filter(s => s.date >= '2026-08-04' && s.date <= '2026-08-11');
  console.log('Sales between 2026-08-04 and 2026-08-11 in DB:', midAugSales.length);
  midAugSales.forEach(s => console.log(`  ${s.date} | ${s.productName} | ${s.size} | ID: ${s.id}`));
}
inspect();
