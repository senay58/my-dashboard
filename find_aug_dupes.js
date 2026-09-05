const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findDuplicates() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const augSales = sales.filter(s => s.date.startsWith('2026-08'));
  
  const counts = {};
  for (const s of augSales) {
    const key = `${s.date} | ${s.productName} | ${s.size} | Qty: ${s.qty} | Price: ${s.unitPrice}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  
  console.log('--- Possible Exact Duplicates in August ---');
  for (const [key, count] of Object.entries(counts)) {
    if (count > 1) {
      console.log(`${key} (Appears ${count} times)`);
    }
  }
}
findDuplicates();
