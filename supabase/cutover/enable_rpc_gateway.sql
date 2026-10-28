-- Execute only after the gateway is deployed and verified with its server-only
-- service credential. Old browser bundles will need to reload after this step.
BEGIN;
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (ARRAY[
      'create_group', 'get_group_by_access_key', 'get_group_by_admin_key',
      'get_group_shift_schedule', 'update_group_shift_schedule',
      'get_staff_list', 'get_staff', 'get_staff_shifts', 'get_shift',
      'upsert_shift', 'delete_shift', 'get_shift_confirmation',
      'set_shift_confirmation', 'add_staff', 'update_staff_name',
      'delete_staff', 'cleanup_old_shifts'
    ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
  END LOOP;
END $$;
COMMIT;
