-- Phase 2: run ONLY after deploying/testing v2 and exporting old device caches.
-- Old tabs then fail visibly instead of overwriting current stock/records.
BEGIN;
UPDATE public.inventory_sync_control_v2 SET enforce_v2 = true WHERE id = 1;
COMMIT;
