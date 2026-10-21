# Jegnit Inventory work log

## 2026-10-21 — missing September 19 / October 19 sales

User requirements: deeply investigate, repair recurring missing sales, protect a
running live system and all records, and keep durable project/work context.

### Production state at handoff

- **v2 deployed; final legacy-write guard and staff-device reconciliation pending.**
  The user ran phase-one SQL and reported success. Read-only RPC verification
  returned `ready`, revision 0, all 472 sales and no missing pre-migration sale IDs.
  The user still intends to run production SQL themselves; do not apply phase two.
- Repair release source: `0132935dce612ef72928da65d50e7a236d93680b`, deployed from
  `senay58/my-dashboard` main. Production deployment:
  `dpl_HrCS8qNNn3hkWCazPAFqQMBhzdBQ`, verified READY on the original live domain.
  Subsequent documentation-only commits can rebuild the identical application.
- Database checks remained read-only. The agent pushed/deployed the frontend, but
  did not insert a sale, adjust stock, run a migration/cleanup, or reset production.
- A timestamped raw snapshot and SHA-256 were saved under outer `backups/` and
  excluded from Git. Two October 19 sales already exist (ETB 19,300) and six
  September 19 sales exist (ETB 56,500). Completeness beyond these is unconfirmed.
- A second read-only snapshot at 2026-10-21T11:10:57.783Z confirmed the same counts
  and business data. Its filename is `inventory-2026-10-21T11-10-57-783Z.json`, hash
  `7584982beb08544a1c74d71c29c0c83081a4bcbad72c4a2ad61a029a266e0eca`.
- Existing untracked `check_target_prods.js`, `insert_sept19_sales.js`, and
  `verify_sept19.js` were left untouched and were not executed.
- Repair source is on `codex/safe-sales-persistence` and was pushed to that remote
  branch, verified in preview, then fast-forwarded to remote main for production.
  The pre-existing untracked scripts remain untouched.

### Findings and implemented changes

- Confirmed production date exclusion removed all October 19 sales; September 19
  had the same ban before the October 10 patch. Removed every calendar-based ban.
- Replaced whole-snapshot auto-upsert/effect suppression with pure business actions,
  durable commands, idempotent receipts and revision-checked atomic commits.
- Preserved legacy caches for reviewed recovery, with no automatic stale-cache
  upload. Confirmed data is distinct from pending/rejected operations.
- Added cloud confirmation, protected submit, explicit pending/rejected feedback,
  retry/refresh and device export. Storage/network errors are surfaced.
- Added additive SQL, audit snapshots, compatibility merging of omitted legacy sale
  IDs, and separate activation to reject all older-version writes.
- Corrected Addis Ababa defaults, same-product/repeated-size exchange stock,
  partial-return remaining quantity, duplicate-return rejection, and inconsistent
  returned-sale totals. Bulk reset is disabled while protecting live records.
- Added root/frontend AGENTS.md and project/operations/work documentation.

### Validation evidence

- `npm test`: 16 regression tests passed, including date bans, local business date,
  invalid sales, partial/same-product/repeated-size exchanges, no startup writes,
  competing devices, last-item contention, reload after offline save, lost commit
  response, storage quota failure, missing migration, shared-tab dedupe, failure to
  persist acknowledgement, stale stock edits, and transfer receipt consistency.
- `npm run test:database`: 10 tests including the parent passed against isolated
  PostgreSQL 18 at 127.0.0.1:55439/jegnit_regression, loaded from the backup copy.
  Verified exact business-field preservation on install/rerun, atomic sale+stock,
  durable receipt dedupe, stale revision rejection, concurrent connections, legacy
  filter compatibility, audit, phase-two old upsert/delete rejection, invalid-payload
  rollback, protected audit/receipt tables and preservation of existing RLS denial.
- Browser → Supabase JS RPC → local adapter → actual Postgres → UI was exercised:
  a historical October 19 sale saved, deducted stock once and appeared after reload
  in Sales Overview. A current-day sale was also exercised. These synthetic sales
  exist only in the disposable local copy; they were never sent to production.
- Local screenshot: outer `backups/local-oct19-history.png`. Its October 19 total
  includes synthetic test sales; do not confuse it with the production baseline.
- Production build passed. Existing warnings concern module format, old Browserslist
  data and a large bundle; no new dependency was introduced.
- Deployment verification: preview `dpl_6MK84aYC7AYQ8UwbMyaP1Mj5YCbr` built READY.
  Its authenticated JS asset matched the tested local bundle and used the correct
  Supabase project and new RPC with no October 19 filter. The live production alias
  then served the same `/assets/index-CwIAguo-.js` bundle.
- Live browser verification: cloud status verified; Sales Overview showed October 19
  as 2 sales / ETB 19,300 and September 19 as 6 sales / ETB 56,500. October 19 survived
  reload. No production test sale was created. Screenshot:
  outer `backups/live-oct19-history.png`. Post-deploy backup confirmed all four
  business arrays are identical to the pre-migration backup.
- Post-deploy backup: `inventory-2026-10-21T11-21-09-117Z.json`, SHA-256
  `0911f14ad7cd6c256ae4f01b56ee0d551e15c207585a654c6aa597facbaaa4d0`.

### Next work, in order

1. Refresh every staff device without clearing site data, then use Export device
   backup and preserve/reconcile old device records. Do not re-enter the existing
   September/October sales. Staff-device exports have not been provided yet.
2. User runs `supabase/activate-safe-saves.sql` after updated-device checks and
   exports. This is still pending; legacy clients remain permitted during rollout.
3. Verify activation, all active clients, and the next legitimate sale through a
   second device/reload. Take a fresh backup and compare historical IDs/counts.
4. Update this log with exact activation evidence. Then handle the
   authentication/RLS and independent backup follow-ups described in PROJECT_CONTEXT.

The incident is **deployed and verified for live historical visibility, awaiting
final legacy-write activation and device reconciliation**.
Do not claim that all missing sales were recovered or that future data loss is
impossible. Do not re-create September/October records from memory or scripts.
