const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkReferences() {
  const { data } = await supabase.from('inventory_state_v1').select('sales, transfers, replacements').eq('id', 1).single();
  const sales = data.sales || [];
  const transfers = data.transfers || [];
  const replacements = data.replacements || [];

  const targetProdId = 'b8fc5c6c-d346-456e-8c5d-73f2a231aadf';
  const targetSizeId = '63454ebb-8eca-423a-a4dd-ff552910450a';

  const refSales = sales.filter(s => s.productId === targetProdId || s.sizeId === targetSizeId);
  const refTransfers = transfers.filter(t => t.productId === targetProdId || t.sizeId === targetSizeId);
  const refReplacements = replacements.filter(r => r.oldProductId === targetProdId || r.newProductId === targetProdId);

  console.log(`Sales referencing this test product: ${refSales.length}`);
  refSales.forEach(s => console.log(`  Sale: ${s.date} | ${s.productName} | ${s.size} | Qty: ${s.qty} | Total: ${s.total} (ID: ${s.id})`));
  console.log(`Transfers referencing this test product: ${refTransfers.length}`);
  console.log(`Replacements referencing this test product: ${refReplacements.length}`);
}
checkReferences();
