-- Run only against an isolated test database with the migrations applied.
-- The transaction is rolled back, but production is not an appropriate test.
BEGIN;

SELECT * FROM public.create_group(
  '873cb03b-9608-47d4-9064-12db1a4c9c73', 'Gateway test',
  'testAccessKey123', 'testAdminKey1234', ''
);

DO $$
DECLARE
  i integer;
  ip_a text := repeat('a', 64);
  ip_b text := repeat('b', 64);
BEGIN
  IF has_function_privilege('anon', 'public.gateway_check_secret(text,text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can call the gateway checker';
  END IF;
  IF public.gateway_check_secret(ip_a, 'testAccessKey123', false) <> 'valid'
     OR public.gateway_check_secret(ip_a, 'testAdminKey1234', true) <> 'valid' THEN
    RAISE EXCEPTION 'valid key rejected';
  END IF;
  FOR i IN 1..10 LOOP
    IF public.gateway_check_secret(ip_a, 'invalid', false) <> 'invalid' THEN
      RAISE EXCEPTION 'locked before the tenth invalid attempt';
    END IF;
  END LOOP;
  IF public.gateway_check_secret(ip_a, 'testAccessKey123', false) <> 'locked'
     OR public.gateway_check_secret(ip_b, 'testAccessKey123', false) <> 'valid' THEN
    RAISE EXCEPTION 'lockout or IP isolation failed';
  END IF;
  UPDATE shift_maker_security.secret_attempts SET window_started_at = clock_timestamp() - interval '16 minutes'
    WHERE ip_hash = ip_a;
  IF public.gateway_check_secret(ip_a, 'testAccessKey123', false) <> 'valid' THEN
    RAISE EXCEPTION 'lock did not expire';
  END IF;
END $$;

ROLLBACK;
