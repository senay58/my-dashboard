const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function findIdsToBlock() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  const sales = data.sales || [];
  
  const blockedIds = [];
  const seen = new Set();
  
  for (const sale of sales) {
      if (sale.date >= '2026-07-28' && sale.date <= '2026-08-03') {
          const fingerprint = `${sale.date}|${sale.productName}|${sale.size}|${sale.qty}|${sale.total}|${sale.refNum}`;
          if (seen.has(fingerprint)) {
              blockedIds.push(sale.id);
          } else {
              seen.add(fingerprint);
          }
      }
  }
  
  console.log('BLOCKED_IDS =', JSON.stringify(blockedIds));
  console.log('Total duplicates found:', blockedIds.length);
}
findIdsToBlock();
