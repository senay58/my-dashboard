const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const missingSalesData = [
  ["2026-07-28", "Code 5", "M", 1, 7800, "CBE", "ft26209gko1g", "Pickup"],
  ["2026-07-28", "Code 7", "L", 1, 12000, "CBE", "ft26209v0574", "Pickup"],
  ["2026-07-28", "BRA", "38D", 1, 7000, "CBE", "ft26209v0574", "Pickup"],
  ["2026-07-28", "BRA", "36D", 1, 7000, "CBE", "ft26209v0574", "Pickup"],
  ["2026-07-28", "Code 2", "M", 1, 11500, "CBE", "ft26209gk01g", "Pickup"],
  ["2026-07-28", "Code 7", "M", 1, 12000, "BOA", "ft2620ntr1g10704", "Pickup"],
  ["2026-07-28", "Code 7", "M", 1, 12000, "BOA", "ft2620ntr1g10704", "Pickup"],
  ["2026-07-28", "Code 7", "L", 1, 12000, "BOA", "ft2620ntr1g10704", "Pickup"],
  ["2026-07-28", "BRA", "36D", 1, 7000, "BOA", "ft2620ntr1g10704", "Pickup"],
  ["2026-07-28", "CATHRINE TEA", "-", 1, 2800, "Telebirr", "dgs9bavjnf", "Pickup"],
  ["2026-07-28", "Code 12", "XS", 1, 4500, "CBE", "ft26209gk01g", "Pickup"],
  ["2026-07-28", "Code 13B", "L", 1, 11500, "Cash", "—", "Pickup"],
  ["2026-07-29", "BRA", "36D", 1, 7000, "CBE", "ft262102nnqt", "Pickup"],
  ["2026-07-29", "Code 13", "XS", 1, 9200, "CBE", "ft26210qzw0z", "Pickup"],
  ["2026-07-29", "Code 1", "XL", 1, 12500, "CBE", "ft262100xdk8", "Pickup"],
  ["2026-07-29", "Code 7", "M", 1, 12000, "CBE", "ft26210ngbs9", "Delivery"],
  ["2026-07-29", "BRA", "38D", 1, 7000, "Telebirr", "dgs9bavjnf", "Delivery"],
  ["2026-07-29", "Code 2", "L", 1, 11500, "CBE", "ft26210s3zkh", "Pickup"],
  ["2026-07-30", "Code 401", "XL/2XL", 1, 9700, "CBE", "ft ft262112247b ft262112247b", "Delivery"],
  ["2026-07-30", "Code 2", "M", 1, 11500, "CBE", "Ft26211zl2ds", "Delivery"],
  ["2026-07-31", "Code 2", "XL", 1, 11500, "CBE", "Ft26212fj6x0", "Pickup"],
  ["2026-07-31", "BRA", "40D", 1, 7000, "CBE", "Ft26212fj6x0", "Pickup"],
  ["2026-07-31", "Code 2", "L", 1, 11500, "BOA", "FT26212QBFHC82114", "Pickup"],
  ["2026-07-31", "Code 1", "L", 1, 12500, "BOA", "FT26212QBFHC82114", "Pickup"],
  ["2026-07-31", "Code 2A", "M", 1, 11000, "CBE", "Ft26212vwwcg", "Delivery"],
  ["2026-07-31", "Code 1", "M", 1, 12500, "CBE", "ft262126ct73", "Delivery"],
  ["2026-07-31", "Code 9", "M", 1, 7500, "CBE", "ft262126ct73", "Delivery"],
  ["2026-07-31", "Code 2A", "M", 1, 11000, "CBE", "ft262120x9fd", "Delivery"],
  ["2026-07-31", "Code 3", "XL", 1, 10500, "CBE", "ft262120x9fd", "Delivery"],
  ["2026-07-31", "Code 2A", "L", 1, 11000, "CBE", "ft262120xgt4", "Pickup"],
  ["2026-07-31", "Code 2", "S", 1, 11500, "CBE", "Ft26212p9mzm", "Delivery"],
  ["2026-07-31", "Code 402", "XS/S", 1, 9700, "CBE", "ft262124sdfd", "Delivery"],
  ["2026-07-31", "Code 1", "4XL", 1, 12500, "CBE", "ft262120dft8", "Pickup"],
  ["2026-07-31", "BRA", "36C", 1, 7000, "CBE", "Ft26211y4yi0", "Pickup"],
  ["2026-07-31", "Code 7", "L", 1, 12000, "Cash", "—", "Pickup"],
  ["2026-07-31", "SILICONE PANT", "1.2 cm", 1, 30000, "CBE", "Ft26212ym89q", "Pickup"],
  ["2026-07-31", "BRA", "42C", 1, 7000, "CBE", "Ft26213wkpht", "Pickup"],
  ["2026-08-01", "BRA", "36C", 1, 7000, "CBE", "Ft262136fcz5", "Pickup"],
  ["2026-08-01", "Code 13B", "L", 1, 11500, "CBE", "Ft2621306226", "Pickup"],
  ["2026-08-01", "BRA", "40D", 1, 7000, "CBE", "Ft26213gpv1d", "Delivery"],
  ["2026-08-01", "Code 2", "L", 1, 11500, "CBE", "Ft26213rovh2", "Pickup"],
  ["2026-08-01", "Code 1", "L", 1, 12500, "CBE", "Ft262131k5c7", "Pickup"],
  ["2026-08-01", "Code 9", "L", 1, 7500, "CBE", "Ft262131k5c7", "Pickup"],
  ["2026-08-01", "Code 401", "XL/2XL", 1, 9700, "CBE", "ft26213fvl2m", "Delivery"],
  ["2026-08-01", "Code 2A", "L", 1, 11000, "CBE", "ft2621399kw5", "Pickup"],
  ["2026-08-01", "Code 402", "M/L", 1, 9700, "CBE", "Ft26213brs7x", "Pickup"],
  ["2026-08-01", "BRA", "38C", 1, 7000, "CBE", "Ft26213wkpht", "Delivery"],
  ["2026-08-03", "SILICONE", "2.0 cm", 1, 35000, "CBE", "Ft2621569s5f", "Delivery"]
];

async function undoRecovery() {
  console.log('Fetching remote state to undo duplicates safely...');
  const { data, error } = await supabase.from('inventory_state_v1').select('*').eq('id', 1).single();
  if (error) return console.error('Fetch error:', error);
  
  let sales = data.sales || [];
  let removedCount = 0;
  
  // For each record we manually added earlier, find ONE exact match and remove it
  for (const row of missingSalesData) {
    const [date, pName, pSize, qty, total, paymentMethod, refNum, deliveryType] = row;
    const targetSize = pSize === '-' || pSize === '0' ? '0' : pSize;
    const targetRef = refNum === '—' ? '' : refNum;
    
    // Find the index of ONE identical sale
    const index = sales.findIndex(s => 
        s.date === date && 
        s.productName === pName && 
        s.total === total && 
        (s.refNum === targetRef || (!s.refNum && !targetRef))
    );
    
    if (index !== -1) {
        // Remove exactly this one copy
        sales.splice(index, 1);
        removedCount++;
    }
  }
  
  console.log(`Successfully removed exactly ${removedCount} duplicated records.`);
  
  if (removedCount > 0) {
      console.log('Updating database...');
      const { error: upErr } = await supabase.from('inventory_state_v1').update({ sales }).eq('id', 1);
      if (upErr) console.error('Update error:', upErr);
      else console.log('Database updated successfully! Duplicates are gone.');
  }
}

undoRecovery();
