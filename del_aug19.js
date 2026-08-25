const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function deleteAug19Test() {
  const { data, error } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  if (error) return console.error('Fetch error:', error);
  
  const sales = data.sales || [];
  const beforeCount = sales.length;
  
  // Filter out the test sale on 2026-08-19
  const validSales = sales.filter(s => !(s.date === "2026-08-19" && s.productName === "Code 1" && s.total === 1000));
  
  const removed = beforeCount - validSales.length;
  console.log(`Removed ${removed} test sales from Aug 19`);
  
  if (removed > 0) {
      await supabase.from('inventory_state_v1').update({ sales: validSales }).eq('id', 1);
      console.log('Database updated successfully!');
  }
}

deleteAug19Test();
