# Jegnit Inventory project context

Last investigated: 2026-10-21 (Africa/Addis_Ababa). See WORK_LOG.md for release status.

## Purpose and business workflow

Jegnit tracks product models with sizes, prices in ETB, main warehouse stock, shop
stock, sales, exchanges, and stock transfers. Admin manages products/prices/main
stock and requests transfers. A request deducts main stock and creates a pending
transfer. Sales staff confirm physical receipt, which adds shop stock. A sale
deducts shop stock. Digital/bank payments require a reference. Delivery is Pickup
or Delivery. Reports summarize daily/monthly sales and retain exchange history.
Payment options: Cash, CBE, Telebirr, BOA, Dashen Bank, Awash Bank.

## Verified deployment identity

| Item | Verified value |
| --- | --- |
| Live website | https://jegnit-inventory-tracking-system-v1.vercel.app/ |
| Vercel project | jegnit-inventory-tracking-system-v1 |
| Vercel project ID | prj_hlLRYyWCnZPob0lVQ73MND7xAvJ0 |
| Production repository | senay58/my-dashboard, checked out in this frontend folder |
| Production branch | main |
| Production commit at investigation | cc5b44416183541592571a16c78cd045eb6195b3 |
| Production deployment at investigation | dpl_6xsNCwLJZwhrXsJy5etdMDiXYmaw |
| Repaired production commit (2026-10-21) | 0132935dce612ef72928da65d50e7a236d93680b |
| Repaired production deployment | dpl_HrCS8qNNn3hkWCazPAFqQMBhzdBQ |
| Outer repository | senay58/jegnit-inventory (contains frontend Git link) |
| Supabase project reference | fdsebosoendtafpomjnq |
| Data location | public.inventory_state_v1, singleton id=1 |

The downloaded production asset contained the same Supabase hostname as local
configuration and the October 19 filter. The live site is a React 18/Vite 5 SPA
with React Router, Chart.js, jsPDF and Tailwind/PostCSS. It talks directly to
Supabase. The outer `backend/` Express/model files are a separate scaffold; the
active frontend does not call them. Its package.json is empty.

Configuration names: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. `.env` is ignored.
Do not copy credentials into these documents. Supabase anon keys are browser keys;
service-role keys must never be placed in VITE variables.

## Incident: September 19 / October 19, 2026

The old InventoryContext loaded one JSON snapshot containing products, sales,
replacements and transfers. Both cache hydration and remote updates dropped all
sales on selected dates as supposed test data. Git commit cc5b444 (October 10)
removed the September 19 block but left October 19 blocked. Date filtering is the
confirmed display/sync defect; this is not evidence of a monthly database outage.

Additional loss paths in that version:

- Each browser automatically upserted the entire singleton snapshot with no
  revision check. A stale browser could replace more recent sales and stock.
- Remote changes set a 100 ms suppression flag. A genuine local save during that
  window could miss the sync effect entirely.
- Fetch errors were treated like an empty remote, then startup could upload cache.
- The form said "Sale recorded" before a network save completed. Local storage
  failures were swallowed, and failed cloud saves had no durable retry queue.
- Union-by-ID resurrected deliberately deleted records from old caches, while
  remote precedence could replace an unsaved stock deduction.
- UTC date defaults misdated entries during the first three local hours of a day.

Read-only snapshot at 2026-10-21T10:49:40.189Z (13:49 EAT):

| Collection / date | Count | Active sales amount |
| --- | ---: | ---: |
| Products | 21 | |
| Sales | 472 | |
| Replacements | 8 | |
| Transfers | 87 | |
| 2026-09-19 | 6 sales | ETB 56,500 |
| 2026-10-19 | 2 sales | ETB 19,300 |

Both reported dates already have records in the database. Do not reinsert them or
deduct stock again. Completeness still requires comparison with staff receipts or
device exports. The September recovery script in the working directory contains
six proposed rows; its presence does not prove when or how they were inserted.
The snapshot had no missing/duplicate IDs and no negative stock quantities.

Backup: outer `backups/inventory-2026-10-21T10-49-40-189Z.json`, SHA-256:
`0117e0b116db38815bcc558db04a06712b547f56f9dd851cce3729295dcd7e29`.
Raw backups and local screenshot evidence are ignored by the outer Git repository.

## Implemented v2 flow (deployed; final legacy-write activation pending)

1. `src/inventory/store.mjs` preserves the original v1 browser cache and stores each
   command under its own UUID outbox key before any request. Confirmed cache is a
   separate v2 key. Unreviewed legacy data is never automatically uploaded.
2. The store calls `inventory_commit_v2` to check for an existing receipt and read
   the current revision, then runs `applyInventoryAction` against that state.
3. Postgres locks the singleton row and accepts the full transaction only at the
   expected revision. Contention returns conflict; the command is rebuilt against
   the latest state. IDs/timestamps remain stable. Receipt lookup happens before
   replay so a lost response cannot double-deduct even the last item.
4. Audit snapshot and receipt are committed in the same database transaction. The
   RPC uses SECURITY INVOKER and preserves the inventory table's existing RLS.
   Restricted SECURITY DEFINER triggers write audit/receipt tables only.
5. Only after cloud acknowledgement is cached is the command retired. Network
   errors leave it pending across reloads. Business validation failures are retained
   for review and never auto-replayed. Poll/focus/online/storage/realtime events
   refresh/retry through one serialized worker. Local persistence failures surface.
6. Sales UI shows confirmed, pending or rejected outcomes and prevents double-click
   submission. The global banner shows save status; its refresh/export buttons were
   removed at the user's request. Automatic retries and preserved caches remain.

The protocol protects cooperative client consistency. It is not a replacement for
real authentication or server-side business authorization. A malicious caller with
the existing anonymous write privileges is outside this consistency guarantee.

Other corrections included: Addis Ababa default dates; partial exchanges retain the
unreturned quantity; stock deltas aggregate repeated sizes and same-product
exchanges; returned sales cannot be exchanged again; reports/dashboard exclude
returned rows consistently. Bulk reset is disabled to protect live records.

## Files to know

- `src/context/InventoryContext.jsx`: React subscription, lifecycle, exported API.
- `src/inventory/actions.mjs`: pure business transactions, stable IDs, validation.
- `src/inventory/store.mjs`: durable queue, cloud receipts, retries, recovery export.
- `src/inventory/dates.mjs`, `summaries.mjs`: business dates and reporting helpers.
- `src/pages/`: Products, Sales, Transfers, Replacements, Reports, SalesOverview,
  AdminDashboard, Settings, Login.
- `supabase/migrations/20261021_safe_inventory.sql`: additive phase-one migration.
- `supabase/activate-safe-saves.sql`: phase-two old-client write guard.
- `supabase/verify-safe-saves.sql`: read-only deployment inspection.
- `scripts/backup-inventory.cjs`: read-only snapshot, hash and date/count summary.
- `tests/`: business/sync regression tests and real PostgreSQL integration tests.

## Remaining risks and follow-up priorities

1. Finish rollout with user-run phase-two activation. The user cannot access staff
   phones and reports that the data is consistent. Device exports are not a blocking
   prerequisite; ask staff to refresh before their next sale, preserving site data.
   The repaired frontend is deployed and phase-one SQL was installed by the user.
2. Review device exports and original staff records for additional missing sales.
   A missing database row alone does not prove whether stock was already deducted.
3. Replace client-only email/password comparison and plaintext local credentials
   with Supabase Auth and role-based RLS. Login currently gates UI only, and the
   provider reads anonymously before login. Do not call this resolved by v2.
4. Configure independent scheduled backups and monitor audit-table storage. The
   audit currently retains full revisions; no automatic pruning has been installed.
   A snapshot in the same database does not cover loss of the whole database.
5. Consider normalized tables/server-side domain commands as volume grows. v2 keeps
   the existing JSON model to minimize migration risk, but full-state transactions
   and audit snapshots grow with history.
6. Review pending-transfer deletion/cancellation and stocked-product deletion rules.
   These legacy admin actions can remove operational history/stock references.
7. Preserve confirmed recovery/duplicate identities in reviewed migration records;
   never replace them with calendar-date bans or silent runtime cleanup.
