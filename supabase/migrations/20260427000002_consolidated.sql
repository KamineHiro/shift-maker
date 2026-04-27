-- スキーマ全体の統合マイグレーション（現行の最終状態）

-- ---------------------------------------------------------------------------
-- カラム追加
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups (id) ON DELETE CASCADE;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS is_shift_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups (id) ON DELETE CASCADE;

UPDATE public.shifts s
SET group_id = st.group_id
FROM public.staff st
WHERE s.staff_id = st.id
  AND s.group_id IS NULL
  AND st.group_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- トリガー
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- インデックス
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_staff_group_id ON public.staff (group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_group_id ON public.shifts (group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_staff_id ON public.shifts (staff_id);

-- ---------------------------------------------------------------------------
-- RPC 関数
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(
  p_id uuid,
  p_name text,
  p_access_key text,
  p_admin_key text,
  p_admin_password text  -- 後方互換のため残すが使用しない
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
  INSERT INTO public.groups (id, name, access_key, admin_key, owner_id)
  VALUES (p_id, p_name, p_access_key, p_admin_key, 1);

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

-- admin_key はレスポンスに含めない（フロントエンドはユーザー入力値を使用）
DROP FUNCTION IF EXISTS public.get_group_by_admin_key(text);
CREATE FUNCTION public.get_group_by_admin_key(p_admin_key text)
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
  SET shift_start_date = p_start_date,
      shift_days = p_shift_days
  WHERE g.admin_key = p_admin_key;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 1;
END;
$$;

-- verify_admin_password は廃止
DROP FUNCTION IF EXISTS public.verify_admin_password(text, text);

-- ---------------------------------------------------------------------------
-- カラム削除
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups DROP COLUMN IF EXISTS admin_password;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_service_role_all" ON public.groups;
CREATE POLICY "groups_service_role_all"
  ON public.groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- anon はテーブルを直接読めない（RPC のみ）
REVOKE ALL ON TABLE public.groups FROM anon;

-- 旧ポリシーを削除
DROP POLICY IF EXISTS "グループの削除は管理者のみ" ON public.groups;
DROP POLICY IF EXISTS "グループの更新は管理者のみ" ON public.groups;
DROP POLICY IF EXISTS "誰でもアクセスキーまたは管理者キーで検索で" ON public.groups;
DROP POLICY IF EXISTS "誰でも新しいグループを作成できる" ON public.groups;

DROP POLICY IF EXISTS "authenticated_can_delete_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_insert_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_read_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_update_shifts" ON public.shifts;
DROP POLICY IF EXISTS "同じグループのシフトを誰でも閲覧できる" ON public.shifts;
DROP POLICY IF EXISTS "自分のシフトまたは管理者は削除可能" ON public.shifts;
DROP POLICY IF EXISTS "自分のシフトまたは管理者は更新可能" ON public.shifts;
DROP POLICY IF EXISTS "誰でもシフトを追加できる" ON public.shifts;
DROP POLICY IF EXISTS "Allow all access to staff during development" ON public.staff;

DROP POLICY IF EXISTS "shifts_anon_app_access" ON public.shifts;
CREATE POLICY "shifts_anon_app_access"
  ON public.shifts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "staff_anon_app_access" ON public.staff;
CREATE POLICY "staff_anon_app_access"
  ON public.staff
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 権限付与
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_group(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_by_access_key(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_by_admin_key(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_group_shift_schedule(text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.update_group_shift_schedule(text, date, int) TO anon;
