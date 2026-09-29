const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectTransfersAndProducts() {
  const { data, error } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  if (error) {
    console.error('Error fetching state:', error);
    return;
  }
  const transfers = data.transfers || [];
  console.log(`Total transfers: ${transfers.length}`);
  console.log('Transfers list:');
  transfers.forEach(t => {
    console.log(`[${t.status}] ${t.date} (${t.createdAt}) | ${t.productName} | ${t.size} | qty: ${t.qty} | confirmedAt: ${t.confirmedAt}`);
  });

  const products = data.products || [];
  console.log('\nProducts stock summary:');
  products.forEach(p => {
    (p.sizes || []).forEach(s => {
      if (s.mainStockQty > 0 || s.shopStockQty > 0) {
        console.log(`  ${p.name} (${s.size}): Main=${s.mainStockQty}, Shop=${s.shopStockQty}`);
      }
    });
  });
}
inspectTransfersAndProducts();
