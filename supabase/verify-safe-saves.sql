-- Read-only inspection after installation/activation. No test sales are inserted.
BEGIN READ ONLY;
SELECT id, revision,
       jsonb_array_length(products::jsonb) AS products,
       jsonb_array_length(sales::jsonb) AS sales,
       jsonb_array_length(replacements::jsonb) AS replacements,
       jsonb_array_length(transfers::jsonb) AS transfers
FROM public.inventory_state_v1 WHERE id = 1;

SELECT sale->>'date' AS sale_date, count(*) AS records,
       sum(CASE WHEN sale->>'status' = 'returned' THEN 0 ELSE coalesce((sale->>'total')::numeric, 0) END) AS active_total_etb
FROM public.inventory_state_v1 state, jsonb_array_elements(state.sales::jsonb) sale
WHERE state.id = 1 AND sale->>'date' IN ('2026-09-19', '2026-10-19')
GROUP BY sale->>'date' ORDER BY sale_date;

SELECT enforce_v2 FROM public.inventory_sync_control_v2 WHERE id = 1;
SELECT count(*) AS stored_revisions, max(revision) AS newest_revision FROM public.inventory_state_history_v2;
SELECT to_regprocedure('public.inventory_commit_v2(uuid,bigint,jsonb)') AS save_function;
COMMIT;
