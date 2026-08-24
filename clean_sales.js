const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanTestData() {
  console.log('Fetching current state...');
  const { data, error } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  
  const originalSales = data.sales || [];
  
  // Filter out any sales before 2026-06-01 OR after 2026-08-31
  const validSales = originalSales.filter(sale => {
      const isBeforeJune = sale.date < "2026-06-01";
      const isFutureTest = sale.date >= "2026-09-01";
      return !isBeforeJune && !isFutureTest;
  });
  
  const removedCount = originalSales.length - validSales.length;
  
  console.log(`Original sales count: ${originalSales.length}`);
  console.log(`Valid sales count: ${validSales.length}`);
  console.log(`Removed ${removedCount} test sales.`);
  
  if (removedCount > 0) {
      console.log('Updating database...');
      const { error: upErr } = await supabase.from('inventory_state_v1').update({ sales: validSales }).eq('id', 1);
      if (upErr) console.error('Update error:', upErr);
      else console.log('Successfully cleaned test sales!');
  } else {
      console.log('No test sales found to clean.');
  }
}

cleanTestData();
