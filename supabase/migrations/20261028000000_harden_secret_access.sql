-- 関数には既定で PUBLIC の EXECUTE 権限が付くため、内部ヘルパーへの
-- 直接アクセスを明示的に禁止する。SECURITY DEFINER RPC からは呼び出せる。
REVOKE ALL ON FUNCTION public._resolve_secret_group_id(text, boolean)
  FROM PUBLIC, anon, authenticated;

-- 移行履歴だけでは staff / shifts の RLS が有効か保証できない。
-- anon に継承され得る PUBLIC 権限も含め、直接アクセスを禁止する。
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.groups, public.staff, public.shifts FROM PUBLIC, anon;
