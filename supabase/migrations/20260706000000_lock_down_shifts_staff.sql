-- shifts / staff テーブルを groups と同じ防御レベルに揃える。
-- anon からの直接テーブルアクセスを禁止し、シークレット検証済みの
-- SECURITY DEFINER RPC 経由のみに集約する。

-- ---------------------------------------------------------------------------
-- 内部ヘルパー（anon には GRANT しない。他の SECURITY DEFINER 関数からのみ使用）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._resolve_secret_group_id(
  p_secret text,
  p_is_admin_key boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
BEGIN
  SELECT g.id INTO v_group_id
  FROM public.groups g
  WHERE CASE
    WHEN p_is_admin_key THEN g.admin_key = p_secret
    ELSE g.access_key = p_secret
  END
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'invalid secret' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_group_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- メンバー権限 RPC（access_key または admin_key で照合）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_staff_list(
  p_secret text,
  p_is_admin_key boolean DEFAULT false
)
RETURNS SETOF public.staff
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
BEGIN
  RETURN QUERY
  SELECT s.* FROM public.staff s
  WHERE s.group_id = v_group_id
  ORDER BY s.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_staff(
  p_secret text,
  p_staff_id uuid,
  p_is_admin_key boolean DEFAULT false
)
RETURNS SETOF public.staff
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
BEGIN
  RETURN QUERY
  SELECT s.* FROM public.staff s
  WHERE s.id = p_staff_id AND s.group_id = v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_staff_shifts(
  p_secret text,
  p_staff_id uuid,
  p_is_admin_key boolean DEFAULT false
)
RETURNS SETOF public.shifts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
BEGIN
  RETURN QUERY
  SELECT sh.* FROM public.shifts sh
  JOIN public.staff s ON s.id = sh.staff_id
  WHERE sh.staff_id = p_staff_id AND s.group_id = v_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shift(
  p_secret text,
  p_staff_id uuid,
  p_date text,
  p_is_admin_key boolean DEFAULT false
)
RETURNS SETOF public.shifts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
BEGIN
  RETURN QUERY
  SELECT sh.* FROM public.shifts sh
  JOIN public.staff s ON s.id = sh.staff_id
  WHERE sh.staff_id = p_staff_id AND sh.date = p_date AND s.group_id = v_group_id;
END;
$$;

-- staff_id・date の一意制約 (shifts_staff_date_unique) を使い、
-- 存在確認と更新/挿入を1文でアトミックに行う。
-- p_preserve_existing_note = true の場合、既存の note を保持する
-- （updateStaffShifts の一括更新が使う挙動をそのまま移植）。
CREATE OR REPLACE FUNCTION public.upsert_shift(
  p_secret text,
  p_staff_id uuid,
  p_date text,
  p_start_time text,
  p_end_time text,
  p_is_off boolean,
  p_note text,
  p_is_admin_key boolean DEFAULT false,
  p_preserve_existing_note boolean DEFAULT false
)
RETURNS SETOF public.shifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = p_staff_id AND s.group_id = v_group_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  INSERT INTO public.shifts (id, staff_id, date, start_time, end_time, is_off, note)
  VALUES (gen_random_uuid(), p_staff_id, p_date, p_start_time, p_end_time, p_is_off, p_note)
  ON CONFLICT (staff_id, date) DO UPDATE
  SET start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      is_off = EXCLUDED.is_off,
      note = CASE
        WHEN p_preserve_existing_note THEN COALESCE(public.shifts.note, '')
        ELSE EXCLUDED.note
      END
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_shift(
  p_secret text,
  p_staff_id uuid,
  p_date text,
  p_is_admin_key boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
  n int;
BEGIN
  DELETE FROM public.shifts sh
  USING public.staff s
  WHERE sh.staff_id = s.id
    AND sh.staff_id = p_staff_id
    AND sh.date = p_date
    AND s.group_id = v_group_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shift_confirmation(
  p_secret text,
  p_staff_id uuid,
  p_is_admin_key boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
  v_confirmed boolean;
BEGIN
  SELECT s.is_shift_confirmed INTO v_confirmed
  FROM public.staff s
  WHERE s.id = p_staff_id AND s.group_id = v_group_id;

  RETURN COALESCE(v_confirmed, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shift_confirmation(
  p_secret text,
  p_staff_id uuid,
  p_confirmed boolean,
  p_is_admin_key boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_secret, p_is_admin_key);
  n int;
BEGIN
  UPDATE public.staff s
  SET is_shift_confirmed = p_confirmed
  WHERE s.id = p_staff_id AND s.group_id = v_group_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

-- ---------------------------------------------------------------------------
-- 管理者専用 RPC（admin_key で直接照合）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_staff(
  p_admin_key text,
  p_name text
)
RETURNS SETOF public.staff
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_admin_key, true);
BEGIN
  RETURN QUERY
  INSERT INTO public.staff (id, name, group_id, user_id, role)
  VALUES (gen_random_uuid(), p_name, v_group_id, NULL, 'staff')
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_name(
  p_admin_key text,
  p_staff_id uuid,
  p_name text
)
RETURNS SETOF public.staff
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_admin_key, true);
BEGIN
  RETURN QUERY
  UPDATE public.staff s
  SET name = p_name
  WHERE s.id = p_staff_id AND s.group_id = v_group_id
  RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff(
  p_admin_key text,
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_admin_key, true);
  n int;
BEGIN
  DELETE FROM public.shifts sh
  USING public.staff s
  WHERE sh.staff_id = s.id AND s.id = p_staff_id AND s.group_id = v_group_id;

  DELETE FROM public.staff s
  WHERE s.id = p_staff_id AND s.group_id = v_group_id;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

-- 6週間以上前のシフトを、呼び出し元グループのみ対象に削除する。
-- (旧実装は全グループ横断で削除していたが、シークレット必須化に伴い
--  グループ境界を越えて他グループのデータを削除できないよう修正)
CREATE OR REPLACE FUNCTION public.cleanup_old_shifts(
  p_admin_key text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid := public._resolve_secret_group_id(p_admin_key, true);
  v_cutoff text := to_char((now() - interval '42 days')::date, 'YYYY-MM-DD');
  n int;
BEGIN
  DELETE FROM public.shifts sh
  WHERE sh.group_id = v_group_id
    AND sh.date < v_cutoff;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS ポリシーの撤去 + anon 直接権限の revoke
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "shifts_anon_app_access" ON public.shifts;
DROP POLICY IF EXISTS "staff_anon_app_access" ON public.staff;

REVOKE ALL ON TABLE public.shifts FROM anon;
REVOKE ALL ON TABLE public.staff FROM anon;

-- ---------------------------------------------------------------------------
-- 権限付与
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_staff_list(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff(text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_staff_shifts(text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shift(text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_shift(text, uuid, text, text, text, boolean, text, boolean, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_shift(text, uuid, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shift_confirmation(text, uuid, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.set_shift_confirmation(text, uuid, boolean, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.add_staff(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_staff_name(text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_staff(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_shifts(text) TO anon;
