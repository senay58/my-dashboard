const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  // Calculate monthly totals
  const monthlyTotals = {};
  for (const s of sales) {
    const month = s.date.slice(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(s.total);
  }
  console.log('--- Monthly Totals ---');
  console.log(monthlyTotals);

  // Find Code 1 test data
  const code1TestSales = sales.filter(s => 
    s.productName === 'Code 1' && (Number(s.unitPrice) === 1000 || Number(s.total) === 1000)
  );
  console.log('\n--- Suspicious Code 1 Sales ---');
  code1TestSales.forEach(s => console.log(`${s.date} | ${s.productName} | ${s.size} | Qty: ${s.qty} | Price: ${s.unitPrice} | Total: ${s.total}`));
  
  // Also list all August sales to spot any other 50,500 discrepancies
  // If the total is 1,070,500, we can see it.
}
check();
