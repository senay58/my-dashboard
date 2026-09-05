const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function applyFixes() {
  const { data, error } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  if (error) throw error;
  let sales = data.sales || [];
  let updated = false;

  // 1. Remove Jun 19 test sale
  const initialLength = sales.length;
  sales = sales.filter(s => !(s.date === '2026-06-19' && s.productName === 'Code 1'));
  if (sales.length < initialLength) {
    console.log(`Removed ${initialLength - sales.length} June 19 Code 1 test sale(s).`);
    updated = true;
  }

  // 2. Mark Aug 15 Code 2 as exchanged
  const exIndex = sales.findIndex(s => s.date === '2026-08-15' && s.productName === 'Code 2' && s.qty === 1 && s.total === 11500);
  if (exIndex !== -1) {
    sales[exIndex].qty = 0;
    sales[exIndex].total = 0;
    sales[exIndex].status = 'returned';
    console.log('Marked Aug 15 Code 2 sale as exchanged (qty=0, total=0, status=returned).');
    updated = true;
  } else {
    console.log('Could not find the Aug 15 Code 2 sale to mark as exchanged.');
  }

  if (updated) {
    const { error: updateError } = await supabase.from('inventory_state_v1').update({ sales }).eq('id', 1);
    if (updateError) throw updateError;
    console.log('Database updated successfully.');
  } else {
    console.log('No changes were made.');
  }
}
applyFixes();
