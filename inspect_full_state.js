const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectFullState() {
  const { data } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  const products = data.products || [];
  const transfers = data.transfers || [];
  const sales = data.sales || [];
  
  console.log(`Products: ${products.length}, Transfers: ${transfers.length}, Sales: ${sales.length}`);
  
  // Find any models where client claims 0 or stock seems off
  console.log("\nProducts where all sizes have Main=0 or Shop=0:");
  products.forEach(p => {
    const totalMain = (p.sizes || []).reduce((sum, s) => sum + (Number(s.mainStockQty) || 0), 0);
    const totalShop = (p.sizes || []).reduce((sum, s) => sum + (Number(s.shopStockQty) || 0), 0);
    console.log(`${p.name}: TotalMain=${totalMain}, TotalShop=${totalShop}`);
  });
}
inspectFullState();
