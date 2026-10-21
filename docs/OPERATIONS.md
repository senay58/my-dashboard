# Safe operation and release procedure

The user chose to run the production SQL themselves. SQL installation and website
deployment are separate actions. Both stages must be verified on production. The
user reports consistent data but cannot access staff phones; historical device
reconciliation remains unverified and does not block activating safe saves.

The two global Retry / refresh and Export device backup buttons were removed at
the user's request. Automatic retries, error/status messages, original caches and
the internal recovery export function remain. Do not ask users to click those
removed buttons. Reloading the page also triggers sync without clearing site data.

## Install this repair

1. Preserve browsers/devices used to enter missing sales. Do not clear their site
   data or uninstall the app. Old code may already have overwritten its own cache;
   recovery is possible only where evidence still exists.
2. From the frontend directory run `npm run backup`. Confirm it succeeds and keep
   the JSON and `.sha256` outside Git. The backup reads live data once, never writes
   it. It is a point-in-time snapshot, not a continuous backup.
3. In Supabase project `fdsebosoendtafpomjnq`, open SQL Editor and run the entire
   `supabase/migrations/20261021_safe_inventory.sql` file. It adds a revision column,
   a protected audit/receipt store, a consistency RPC and triggers. It preserves
   existing products/sales/replacements/transfers, plus an initial database snapshot.
   It runs in one transaction; an installation error rolls that transaction back.
4. Run `supabase/verify-safe-saves.sql`. Save its output. `enforce_v2` should be false
   at this point. Historical counts must not decrease; normal live activity may
   increase them. The investigation baseline was 472 sales, 21 products, 8 exchanges
   and 87 transfers, with 6 September 19 sales and 2 October 19 sales.
5. Verify the RPC with a read-only client request, then deploy the tested frontend
   from `senay58/my-dashboard` to the verified Vercel project. Do not deploy the
   outer backend scaffold. Keep the production Supabase variables on that project.
   A build without them cannot confirm sales. Never deploy the local test API URL.
6. Ask staff to refresh the website before their next sale; physical access to their
   phones is not required. Its original v1 cache is preserved before cloud loading.
   If device data later becomes available, preserve and compare old records against
   database IDs. Do not automatically merge caches or clear site data.
   Verify the existing October 19 rows are visible; there is no need to insert test
   sales into production. For the next legitimate sale, check cloud confirmation,
   one stock deduction, history on a second device, and persistence after reload.
7. After deploying and verifying v2, run `supabase/activate-safe-saves.sql`. The old
   header mentions exports; unavailable phone exports are not a prerequisite under
   the user's updated workflow.
   Old browsers then receive a refresh error instead of being allowed to overwrite
   current stock. Refresh every active tab. Run verification SQL and a fresh backup.
8. Record the production commit/deployment ID, SQL results, counts and affected
   device reconciliation in WORK_LOG.md. The incident is complete only after this.

The compatibility period between steps 3 and 7 intentionally permits legacy
updates, while merging back any existing sale IDs its date filters omit. It does
not solve legacy stock contention or false-success messages by itself. Keep that
period short and coordinate the website deployment. Phase two should not be run
before staff can access the updated app.

The installation reads/writes the existing singleton under a short schema lock,
which can briefly queue requests; do it when convenient and keep exports/backup.
The audit captures future revisions. It cannot reconstruct data deleted before it
was installed. Device-only sales and receipts still require reconciliation.

## Missing or pending sale

- First check raw database records for the business date, not only report totals.
  Preserve stable IDs, status, quantity, total and payment references for comparison.
- Pending in v2 means the command is on that device but the cloud has not confirmed.
  Do not enter it again. Online/focus/polling retry automatically; reloading also
  resumes the saved command without clearing site data.
- Rejected means current business validation failed, for example another device
  sold the last item. It is retained for review and never auto-retried later.
- Preserve device site data before troubleshooting or changing browser profiles.
  Request developer-assisted recovery if the original device becomes available.

An old pre-v2 tab still has its original misleading success message. Activation
blocks its database writes but cannot replace JavaScript already running on a
phone. Ask staff to reload before the next sale, even without direct phone access.
- Confirm whether stock was already deducted before restoring any missing sale.
  Never run `insert_sept19_sales.js` or `recover_sales.js` as a generic repair: they
  generate IDs and overwrite full arrays without current concurrency protection.

## Rollback and recovery

Keep the additive SQL, receipts and history even if a frontend problem appears.
Prefer a forward fix. Do not restore the October 19-filtering frontend as a normal
rollback. After activation it is intentionally prevented from writing.

If a deployment must roll back, preserve current outboxes and coordinate access
before changing the compatibility flag. Re-enabling legacy writes reintroduces
stock contention; do not do it as an automatic rollback step. Do not drop database
tables/triggers, purge receipts, or replace live arrays with a backup.

For record recovery, take another snapshot and compare exact IDs/fields to the
appropriate audit revision. Restore only reviewed differences in a controlled
transaction against the current revision. Audit revisions are not an independent
backup of the Supabase project. Monitor database storage and arrange independent
backups/retention before volume outgrows full revision snapshots.

## Development and verification

`npm test` runs offline regression tests; `npm run build` checks the actual bundle.
No extra dependencies were added for testing.

`npm run test:database` requires `JEGNIT_TEST_DATABASE_URL` targeting exactly a
disposable localhost database named `jegnit_regression`. It resets that test
database's public schema and loads a copy of the read-only backup. It refuses a
remote host or another database name. It must never use production credentials.
`JEGNIT_PSQL` can override the local PostgreSQL executable path.

Example Windows setup (isolated data directory at the outer project root):

```powershell
& 'C:/Program Files/PostgreSQL/18/bin/initdb.exe' -D ../.local-postgres -A trust -U jegnit_test --no-locale --encoding=UTF8
& 'C:/Program Files/PostgreSQL/18/bin/pg_ctl.exe' -D ../.local-postgres -l ../.local-postgres/server.log -o '-h 127.0.0.1 -p 55439' -w start
& 'C:/Program Files/PostgreSQL/18/bin/createdb.exe' -h 127.0.0.1 -p 55439 -U jegnit_test jegnit_regression
$env:JEGNIT_TEST_DATABASE_URL = 'postgresql://jegnit_test@127.0.0.1:55439/jegnit_regression'
npm run test:database
```

For browser verification, start `node scripts/local-test-api.cjs` with the same test
database setting; then start Vite with VITE_SUPABASE_URL set only in that process to
`http://127.0.0.1:55440` and VITE_SUPABASE_ANON_KEY set to `local-test-key`. Do not edit
production `.env` to use those values. This adapter uses real Postgres for RPC but
does not emulate Supabase realtime; polling/focus is used for local verification.
Close temporary services after testing. Never expose the test database publicly.
