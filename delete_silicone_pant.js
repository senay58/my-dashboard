const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  let sales = data.sales || [];

  // Delete SILICONE PANT on Aug 3
  const siliconePantId = sales.find(s => s.date === '2026-08-03' && s.productName === 'SILICONE PANT');
  if (siliconePantId) {
    console.log('Found SILICONE PANT to delete, ID:', siliconePantId.id);
    sales = sales.filter(s => s.id !== siliconePantId.id);
    console.log('Deleted SILICONE PANT from Aug 3.');
  } else {
    console.log('SILICONE PANT not found on Aug 3.');
  }

  // Verify Aug total after deletion
  let augTotal = 0;
  for (const s of sales) {
    if (s.date.startsWith('2026-08')) augTotal += Number(s.total) || 0;
  }
  console.log('New August Total after deletion:', augTotal);

  const { error } = await supabase.from('inventory_state_v1').update({ sales }).eq('id', 1);
  if (error) throw error;
  console.log('Database updated.');
}
fix();
