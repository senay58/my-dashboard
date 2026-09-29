const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMath() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const sales = data.sales || [];
  const transfers = data.transfers || [];
  
  // Starting point Sept 5:
  // Code 401 XS/S: Shop was 2, Main was 10 (wait, let's see what Main was on Sept 5)
  // Let's check sales of Code 401 XS/S after Sept 5
  const c401sales = sales.filter(s => s.productName === 'Code 401' && s.size === 'XS/S' && s.date >= '2026-09-05');
  console.log('Code 401 XS/S sales after Sept 5:', c401sales);

  const c401transfers = transfers.filter(t => t.productName === 'Code 401' && t.size === 'XS/S' && t.date >= '2026-09-05');
  console.log('Code 401 XS/S transfers after Sept 5:', c401transfers);

  // Code 1 M
  const c1mSales = sales.filter(s => s.productName === 'Code 1' && s.size === 'M' && s.date >= '2026-09-05');
  console.log('Code 1 M sales after Sept 5:', c1mSales);
  const c1mTransfers = transfers.filter(t => t.productName === 'Code 1' && t.size === 'M' && t.date >= '2026-09-05');
  console.log('Code 1 M transfers after Sept 5:', c1mTransfers);
}
checkMath();
