-- admin_password は未使用のため、RPC・カラムをともに削除する。
-- create_group は p_admin_password 引数を引き続き受け付けるが無視する（呼び出し元との後方互換）。

-- ---------------------------------------------------------------------------
-- 1. create_group: admin_password カラムへの INSERT を除去
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

-- ---------------------------------------------------------------------------
-- 2. verify_admin_password RPC を削除
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.verify_admin_password(text, text);

-- ---------------------------------------------------------------------------
-- 3. admin_password カラムを削除
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups DROP COLUMN IF EXISTS admin_password;
