const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectAllSales() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  console.log(`Total sales records in Supabase: ${sales.length}`);
  const dates = [...new Set(sales.map(s => s.date))].sort();
  console.log('All unique dates in Supabase sales:');
  console.log(dates.join(', '));
}
inspectAllSales();
