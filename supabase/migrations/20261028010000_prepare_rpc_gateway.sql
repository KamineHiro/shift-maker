-- The gateway calls this function using a server-only service key. Each call is
-- a separate transaction, so a later RPC error cannot roll back an attempt.
CREATE SCHEMA IF NOT EXISTS shift_maker_security;
REVOKE ALL ON SCHEMA shift_maker_security FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS shift_maker_security.secret_attempts (
  ip_hash text PRIMARY KEY,
  failures integer NOT NULL,
  window_started_at timestamptz NOT NULL
);
ALTER TABLE shift_maker_security.secret_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS secret_attempts_window_started_at_idx
  ON shift_maker_security.secret_attempts (window_started_at);
REVOKE ALL ON TABLE shift_maker_security.secret_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.gateway_check_secret(
  p_ip_hash text,
  p_secret text,
  p_is_admin_key boolean
)
RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public, shift_maker_security
AS $$
DECLARE
  v_attempt shift_maker_security.secret_attempts%ROWTYPE;
  v_valid boolean;
BEGIN
  IF p_ip_hash IS NULL OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid request';
  END IF;

  -- Serialize checks from the same IP, including concurrent failed requests.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  SELECT * INTO v_attempt FROM shift_maker_security.secret_attempts WHERE ip_hash = p_ip_hash;
  IF FOUND AND v_attempt.window_started_at > clock_timestamp() - interval '15 minutes'
      AND v_attempt.failures >= 10 THEN
    RETURN 'locked';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE CASE WHEN p_is_admin_key THEN g.admin_key = p_secret
               ELSE g.access_key = p_secret END
  ) INTO v_valid;
  IF v_valid THEN
    RETURN 'valid';
  END IF;

  INSERT INTO shift_maker_security.secret_attempts (ip_hash, failures, window_started_at)
  VALUES (p_ip_hash, 1, clock_timestamp())
  ON CONFLICT (ip_hash) DO UPDATE SET
    failures = CASE WHEN secret_attempts.window_started_at <= clock_timestamp() - interval '15 minutes'
                    THEN 1 ELSE secret_attempts.failures + 1 END,
    window_started_at = CASE WHEN secret_attempts.window_started_at <= clock_timestamp() - interval '15 minutes'
                             THEN clock_timestamp() ELSE secret_attempts.window_started_at END;

  -- Bound cleanup work and retain no expired rows indefinitely under traffic.
  IF random() < 0.01 THEN
    DELETE FROM shift_maker_security.secret_attempts WHERE ip_hash IN (
      SELECT ip_hash FROM shift_maker_security.secret_attempts
      WHERE window_started_at < clock_timestamp() - interval '1 day'
      ORDER BY window_started_at LIMIT 50
    );
  END IF;
  RETURN 'invalid';
END;
$$;

REVOKE ALL ON FUNCTION public.gateway_check_secret(text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gateway_check_secret(text, text, boolean) TO service_role;
