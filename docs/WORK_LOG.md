# Jegnit Inventory work log

## 2026-10-21 — missing September 19 / October 19 sales

User requirements: deeply investigate, repair recurring missing sales, protect a
running live system and all records, and keep durable project/work context.

### Production state at handoff

- **Not deployed. Production SQL has not been run by the agent.** User explicitly
  chose to receive and run the tested SQL themselves. Await their installation
  result before deploying the v2 frontend.
- Production was verified as `cc5b444` from `senay58/my-dashboard`; live Vercel
  project and Supabase reference are in PROJECT_CONTEXT.md.
- Only read-only production HTTP/database/metadata requests were performed. No
  sale insertion, stock adjustment, cleanup, migration or reset was run there.
- A timestamped raw snapshot and SHA-256 were saved under outer `backups/` and
  excluded from Git. Two October 19 sales already exist (ETB 19,300) and six
  September 19 sales exist (ETB 56,500). Completeness beyond these is unconfirmed.
- A second read-only snapshot at 2026-10-21T11:10:57.783Z confirmed the same counts
  and business data. Its filename is `inventory-2026-10-21T11-10-57-783Z.json`, hash
  `7584982beb08544a1c74d71c29c0c83081a4bcbad72c4a2ad61a029a266e0eca`.
- Existing untracked `check_target_prods.js`, `insert_sept19_sales.js`, and
  `verify_sept19.js` were left untouched and were not executed.
- Repair source is on local branch `codex/safe-sales-persistence` in the frontend
  repository. No remote push or production deployment was triggered.

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

### Next work, in order

1. User runs `supabase/migrations/20261021_safe_inventory.sql` in the verified
   Supabase SQL Editor, then provides success/error and read-only verification.
2. Verify RPC readiness and unchanged historical records with read-only requests;
   deploy this frontend to the existing Vercel project (no outer-repo deployment).
3. Export/reconcile affected staff-device data, verify existing historical rows and
   the next legitimate sale through a second device/reload.
4. User runs `supabase/activate-safe-saves.sql`; refresh active clients and verify.
5. Update this log with exact deployment/activation evidence. Then handle the
   authentication/RLS and independent backup follow-ups described in PROJECT_CONTEXT.

The incident is **prepared and locally verified, awaiting production rollout**.
Do not claim that all missing sales were recovered or that future data loss is
impossible. Do not re-create September/October records from memory or scripts.
