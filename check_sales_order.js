const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOrder() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  console.log('Total sales in array:', sales.length);
  
  // See the last 100 sales in the array
  const recent = sales.slice().reverse().slice(0, 100);
  const dates = recent.map(s => s.date);
  const uniqueDates = [...new Set(dates)];
  console.log('Unique dates in recent (reversed slice 0..100):', uniqueDates);

  // See the dates of the sales NOT in that 100
  const older = sales.slice().reverse().slice(100);
  const olderDates = [...new Set(older.map(s => s.date))];
  console.log('Unique dates in older (> 100):', olderDates);
}
checkOrder();
