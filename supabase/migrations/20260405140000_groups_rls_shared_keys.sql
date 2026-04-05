-- 共有キー方式: groups は RLS で直参照を遮断し、キー検証は SECURITY DEFINER の RPC に集約する。
-- 適用: `supabase db push` または Supabase SQL Editor に貼り付け

-- ---------------------------------------------------------------------------
-- スキーマ（既存カラムはスキップ）
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups (id) ON DELETE CASCADE;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS is_shift_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups (id) ON DELETE CASCADE;

-- shifts.group_id を staff から補完
UPDATE public.shifts s
SET group_id = st.group_id
FROM public.staff st
WHERE s.staff_id = st.id
  AND s.group_id IS NULL
  AND st.group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_shift_group_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT st.group_id INTO NEW.group_id
  FROM public.staff st
  WHERE st.id = NEW.staff_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shifts_set_group_id ON public.shifts;
CREATE TRIGGER shifts_set_group_id
  BEFORE INSERT OR UPDATE OF staff_id ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_shift_group_id();

CREATE INDEX IF NOT EXISTS idx_staff_group_id ON public.staff (group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_group_id ON public.shifts (group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts (staff_id);

-- ---------------------------------------------------------------------------
-- RPC: グループ作成・キーでの取得・日付範囲・管理者パスワード検証
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(
  p_id uuid,
  p_name text,
  p_access_key text,
  p_admin_key text,
  p_admin_password text
)
RETURNS TABLE (
  id uuid,
  name text,
  access_key text,
  admin_key text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.groups (
    id,
    name,
    access_key,
    admin_key,
    admin_password,
    owner_id
  )
  VALUES (
    p_id,
    p_name,
    p_access_key,
    p_admin_key,
    p_admin_password,
    1
  );

  RETURN QUERY
  SELECT g.id, g.name, g.access_key, g.admin_key, g.created_at
  FROM public.groups g
  WHERE g.id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_group_by_access_key(p_access_key text)
RETURNS TABLE (
  id uuid,
  name text,
  access_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.access_key
  FROM public.groups g
  WHERE g.access_key = p_access_key
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_group_by_admin_key(p_admin_key text)
RETURNS TABLE (
  id uuid,
  name text,
  access_key text,
  admin_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.access_key, g.admin_key
  FROM public.groups g
  WHERE g.admin_key = p_admin_key
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_group_shift_schedule(
  p_secret text,
  p_is_admin_key boolean DEFAULT false
)
RETURNS TABLE (
  shift_start_date date,
  shift_days int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.shift_start_date, g.shift_days
  FROM public.groups g
  WHERE CASE
    WHEN p_is_admin_key THEN g.admin_key = p_secret
    ELSE g.access_key = p_secret
  END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_group_shift_schedule(
  p_admin_key text,
  p_start_date date,
  p_shift_days int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  UPDATE public.groups g
  SET
    shift_start_date = p_start_date,
    shift_days = p_shift_days
  WHERE g.admin_key = p_admin_key;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(
  p_admin_key text,
  p_plain_password text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.admin_key = p_admin_key
      AND g.admin_password = p_plain_password
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: groups（anon はテーブルを直接読めない／RPC のみ）
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_service_role_all" ON public.groups;
CREATE POLICY "groups_service_role_all"
  ON public.groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- anon にはポリシーを付けず、テーブル権限も剥奪（参照・更新は RPC のみ）

REVOKE ALL ON TABLE public.groups FROM anon;

GRANT EXECUTE ON FUNCTION public.create_group(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_by_access_key(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_by_admin_key(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_shift_schedule(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.update_group_shift_schedule(text, date, int) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text, text) TO anon;
