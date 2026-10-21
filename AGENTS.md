# Jegnit Inventory

Read `docs/PROJECT_CONTEXT.md`, `docs/OPERATIONS.md`, and `docs/WORK_LOG.md` first.
Update the work log with findings, validation, deployment status, and remaining work
at the end of each substantive change. These files are the project's durable context.

- This is a live business system. Do not erase sales, clear browser storage, infer
  missing sales, replay old recovery scripts, or restore a whole snapshot over live
  data. Back up and reconcile by stable record IDs.
- Sales must never be filtered by a hardcoded business date. Historical test cleanup
  requires reviewed record identities and an audit trail.
- The only v2 writer is `inventory_commit_v2`; keep stable operation IDs and the
  durable outbox. Never reintroduce whole-state `upsert` from a browser or automatic
  cache union. A local save is not a cloud confirmation.
- Keep privileged credentials out of the browser and repository. The current local
  login is not server authentication; see the documented security follow-up.
- User requested to run the tested production SQL themselves on 2026-10-21. Do not
  apply it on their behalf unless they change that instruction. Verify installation
  before deploying v2. The user cannot access staff phones and reports consistent
  data; do not require device exports before user-run guard activation. Ask staff
  to refresh before the next sale. Preserve any device data that becomes available.
- Run `npm test` and `npm run build` for persistence changes. SQL changes require
  `npm run test:database` against the explicitly disposable localhost database.
- Preserve pre-existing untracked `check_target_prods.js`, `insert_sept19_sales.js`,
  and `verify_sept19.js`; they predate this investigation and are not safe to execute
  without review. All root-level data correction scripts are historical utilities.
