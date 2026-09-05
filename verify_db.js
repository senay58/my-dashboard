const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const blockedDuplicateIds = new Set([
  "668e3853-8187-4cd9-ba18-45cfe8b27a73","f503aaa8-4cd5-4a4f-8337-8ebad158bbaf","2847775f-2164-4edb-8230-35e5e271ff0b",
  "762e58ee-0850-4936-b45d-5d0d35714504","65f4b110-55e2-4e03-be8d-f2171d24bbc8","d3fa885d-f20e-43de-b5f7-233271a684ab",
  "7ed51203-1da3-41f3-8363-dcc2deaf8b48","80ed0c29-6697-4073-b77b-febc540d469b","e2b2c205-e232-4288-a312-f39407d289ad",
  "c33e197f-e659-42b6-90ba-61949906a930","b09e1241-0961-415d-b249-80ec5bd431b3","129682a9-7a68-4e04-8b2d-cec10c4a3604",
  "fa20af56-1a4c-452b-a213-0b4381661f3a","49d91b7f-c716-4c1d-ba9a-c00481f0df04","07a487d9-0d09-4fa2-aabe-1ce8faf2b99b",
  "81ebfd22-e02a-42a5-9bcd-8a539ab6897c","2c4536f7-b198-4042-967d-c6338d19289b","6f1d8646-127c-4be4-bc08-c56ed6fbc646",
  "79d5ba70-9fa6-4966-ac69-dc30f2c6249d","05a3e7ee-7f6b-4535-9774-ad5f77281d32","8ae4a1f8-9fdd-4bfb-898e-a129d5e5f1c7",
  "7c397815-70ba-480c-b851-7590299acccf","c7a84953-8491-43fe-baa1-1cb9fb2d0f22","87f9f986-4ab9-40f7-8058-932a98dc1eba",
  "0717e12b-987f-47ef-819f-7ba4b82ad2c0","45e52934-d7a1-41b9-8381-a18443f29717","131851e4-9c71-45e5-b4cd-220cd3b49966",
  "a520c940-37e0-4e42-9a8e-81bc7839dfdf","fecfa833-6bd9-4d76-b661-26754ac93b03","d8b7f1e7-1cb7-4153-a176-0c0c86be574b",
  "7bcc3684-1878-472d-a21e-a023f9a1f788","e2e25a14-c366-40c1-a72d-a123c3755c26","0332d9cc-be05-4c9a-b745-8f01acb40036",
  "4b215f3a-d13c-430c-83e7-7b2b6a96ddb4","73271733-5ece-4674-ae22-68695ca6a223","7a36a224-0778-426a-8135-81313b48ebc0",
  "2051aaa3-6b05-4bf7-bd34-9c7abaf46925","392c6109-3e35-40d9-8682-421ddc708f12","b45f885d-e924-42ef-bd73-6395564ded33",
  "113849e4-82ad-4659-8cf5-4327b12c6cca","458d0295-02fd-4503-96e2-9c0595becd5b","97cc6d4c-38b1-4cdb-b0dd-c656782fee22",
  "1a9425c9-0a55-46b5-acaf-fc5eb21bb849","9e997a29-d5bf-44cf-9dbd-820061bf1069","d1c6d2e0-d125-4fcf-a4db-cc8f27f429b9",
  "4eed9497-eef1-4821-991a-62258d7097f1","2b9b9bd8-266e-4a80-bd63-72e52ff3af68","6e8e1c06-1c52-4649-be98-fcd6ae8eb5e5"
]);

async function run() {
  const { data } = await supabase.from('inventory_state_v1').select('sales').eq('id', 1).single();
  let sales = data.sales || [];
  
  // Apply frontend filter
  sales = sales.filter(s => {
    if (s.id && blockedDuplicateIds.has(s.id)) return false;
    if (s.date && s.total !== undefined) {
      const isFakeAug19 = (s.date === "2026-08-19" && s.productName === "Code 1" && s.total === 1000);
      if (s.date < "2026-06-01" || s.date === "2026-09-19" || s.date === "2026-10-19" || isFakeAug19) return false;
    }
    return true;
  });

  const aug15Code2 = sales.find(s => s.date === '2026-08-15' && s.productName === 'Code 2');
  console.log('Aug 15 Code 2:', aug15Code2);

  const aug3Sales = sales.filter(s => s.date === '2026-08-03');
  console.log('Aug 3 Sales:', aug3Sales);

  let augTotal = 0;
  for (const s of sales) {
    if (s.date.startsWith('2026-08')) {
      augTotal += Number(s.total) || 0;
    }
  }
  console.log('Filtered August Total:', augTotal);
}
run();
