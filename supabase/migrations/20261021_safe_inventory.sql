-- Phase 1: additive installation. Does not replace or delete business records.
-- Run against the verified production database ONLY after a fresh read-only backup.
-- During rollout, legacy saves retain any existing sale IDs omitted by old filters.
-- Phase two blocks legacy writers entirely; keep the compatibility period short.
BEGIN;

ALTER TABLE public.inventory_state_v1 ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.inventory_mutations_v2 (
  id uuid PRIMARY KEY,
  revision bigint NOT NULL,
  committed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.inventory_state_history_v2 (
  revision bigint PRIMARY KEY,
  captured_at timestamptz NOT NULL DEFAULT now(),
  mutation_id uuid,
  snapshot jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.inventory_sync_control_v2 (
  id integer PRIMARY KEY CHECK (id = 1),
  enforce_v2 boolean NOT NULL DEFAULT false
);
INSERT INTO public.inventory_sync_control_v2 (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.inventory_mutations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_state_history_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_sync_control_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_mutations_v2, public.inventory_state_history_v2, public.inventory_sync_control_v2 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.inventory_mutations_v2 TO anon, authenticated;
DROP POLICY IF EXISTS inventory_receipts_read ON public.inventory_mutations_v2;
CREATE POLICY inventory_receipts_read ON public.inventory_mutations_v2 FOR SELECT TO anon, authenticated USING (true);

-- Preserve the exact pre-migration state, including fields not used by this release.
INSERT INTO public.inventory_state_history_v2 (revision, snapshot)
SELECT revision, to_jsonb(s) FROM public.inventory_state_v1 s WHERE id = 1
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.inventory_guard_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  mutation text := nullif(current_setting('jegnit.mutation_id', true), '');
  require_v2 boolean;
BEGIN
  IF OLD.id <> 1 THEN
    RAISE EXCEPTION 'Unexpected inventory row. Update cancelled.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Deleting live inventory is disabled. Use a reviewed recovery procedure.';
  END IF;
  IF NEW.id <> OLD.id THEN RAISE EXCEPTION 'Inventory identity cannot change.'; END IF;
  SELECT enforce_v2 INTO require_v2 FROM public.inventory_sync_control_v2 WHERE id = 1;
  IF require_v2 AND mutation IS NULL THEN
    RAISE EXCEPTION 'Refresh Jegnit Inventory before saving. This browser is using an older version.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(OLD.sales::jsonb, '[]'::jsonb)) previous
    WHERE previous->>'id' IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(NEW.sales::jsonb, '[]'::jsonb)) incoming
      WHERE incoming->>'id' = previous->>'id'
    )
  ) THEN
    IF mutation IS NULL AND NOT require_v2 THEN
      -- Old production code filters October 19 out of every fetched snapshot.
      -- Preserve those rows without breaking its saves during the rollout.
      NEW.sales := coalesce(NEW.sales::jsonb, '[]'::jsonb) || (
        SELECT jsonb_agg(previous)
        FROM jsonb_array_elements(coalesce(OLD.sales::jsonb, '[]'::jsonb)) previous
        WHERE previous->>'id' IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(coalesce(NEW.sales::jsonb, '[]'::jsonb)) incoming
          WHERE incoming->>'id' = previous->>'id'
        )
      );
    ELSE
      RAISE EXCEPTION 'Save would remove existing sales. Refresh the app; no records were changed.';
    END IF;
  END IF;
  NEW.revision := OLD.revision + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.inventory_audit_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE mutation uuid := nullif(current_setting('jegnit.mutation_id', true), '')::uuid;
BEGIN
  INSERT INTO public.inventory_state_history_v2 (revision, snapshot)
    VALUES (OLD.revision, to_jsonb(OLD)) ON CONFLICT DO NOTHING;
  INSERT INTO public.inventory_state_history_v2 (revision, mutation_id, snapshot)
    VALUES (NEW.revision, mutation, to_jsonb(NEW));
  IF mutation IS NOT NULL THEN
    INSERT INTO public.inventory_mutations_v2 (id, revision) VALUES (mutation, NEW.revision);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_guard_v2 ON public.inventory_state_v1;
CREATE TRIGGER inventory_guard_v2 BEFORE UPDATE OR DELETE ON public.inventory_state_v1
FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_v2();
DROP TRIGGER IF EXISTS inventory_audit_v2 ON public.inventory_state_v1;
CREATE TRIGGER inventory_audit_v2 AFTER UPDATE ON public.inventory_state_v1
FOR EACH ROW EXECUTE FUNCTION public.inventory_audit_v2();
REVOKE ALL ON FUNCTION public.inventory_guard_v2(), public.inventory_audit_v2() FROM PUBLIC, anon, authenticated;

-- SECURITY INVOKER preserves the existing inventory table's grants and RLS.
-- A read/check with p_state=NULL does not change any data or create a receipt.
CREATE OR REPLACE FUNCTION public.inventory_commit_v2(
  p_mutation_id uuid DEFAULT NULL,
  p_expected_revision bigint DEFAULT -1,
  p_state jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE
  current_row public.inventory_state_v1%ROWTYPE;
  key text;
BEGIN
  SELECT * INTO current_row FROM public.inventory_state_v1 WHERE id = 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory row is missing or inaccessible. No data was written.'; END IF;
  IF p_mutation_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.inventory_mutations_v2 WHERE id = p_mutation_id) THEN
    RETURN jsonb_build_object('status', 'duplicate', 'state', to_jsonb(current_row));
  END IF;
  IF p_state IS NULL THEN RETURN jsonb_build_object('status', 'ready', 'state', to_jsonb(current_row)); END IF;
  IF p_mutation_id IS NULL THEN RAISE EXCEPTION 'A durable operation ID is required.'; END IF;
  IF p_expected_revision <> current_row.revision THEN
    RETURN jsonb_build_object('status', 'conflict', 'state', to_jsonb(current_row));
  END IF;
  FOREACH key IN ARRAY ARRAY['products', 'sales', 'replacements', 'transfers'] LOOP
    IF jsonb_typeof(p_state->key) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Incomplete inventory payload: %', key; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_state->key) item WHERE nullif(item->>'id', '') IS NULL)
      OR (SELECT count(*) FROM jsonb_array_elements(p_state->key)) <>
         (SELECT count(DISTINCT item->>'id') FROM jsonb_array_elements(p_state->key) item) THEN
      RAISE EXCEPTION 'Missing or duplicate record identity in %', key;
    END IF;
  END LOOP;
  PERFORM set_config('jegnit.mutation_id', p_mutation_id::text, true);
  UPDATE public.inventory_state_v1
    SET products = p_state->'products', sales = p_state->'sales',
        replacements = p_state->'replacements', transfers = p_state->'transfers'
    WHERE id = 1 RETURNING * INTO current_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory save was denied. No confirmation was recorded.'; END IF;
  PERFORM set_config('jegnit.mutation_id', '', true);
  RETURN jsonb_build_object('status', 'committed', 'state', to_jsonb(current_row));
END;
$$;
REVOKE ALL ON FUNCTION public.inventory_commit_v2(uuid, bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inventory_commit_v2(uuid, bigint, jsonb) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
