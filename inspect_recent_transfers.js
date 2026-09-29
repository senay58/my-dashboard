const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectRecentTransfers() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const transfers = data.transfers || [];
  
  // Sort descending by createdAt
  const sorted = [...transfers].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  console.log('Top 15 most recent transfers:');
  sorted.slice(0, 15).forEach(t => {
    console.log(`${t.status.toUpperCase()} | Created: ${t.createdAt} | Confirmed: ${t.confirmedAt} | ${t.productName} (${t.size}) qty: ${t.qty}`);
  });
}
inspectRecentTransfers();
