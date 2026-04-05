-- ダッシュボード等で作られた旧ポリシーを削除し、groups は RPC 設計のままに揃える。
-- staff / shifts はブラウザの anon クライアントが直接触るため、整理後も anon 用ポリシーを 1 本ずつ付け直す。

-- ---------------------------------------------------------------------------
-- public.groups（古い「誰でも true」系を削除。service_role 用はマイグレーションで既存）
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "グループの削除は管理者のみ" ON public.groups;
DROP POLICY IF EXISTS "グループの更新は管理者のみ" ON public.groups;
DROP POLICY IF EXISTS "誰でもアクセスキーまたは管理者キーで検索で" ON public.groups;
DROP POLICY IF EXISTS "誰でも新しいグループを作成できる" ON public.groups;

-- ---------------------------------------------------------------------------
-- public.shifts（重複・誤った式のポリシーを削除）
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_can_delete_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_insert_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_read_shifts" ON public.shifts;
DROP POLICY IF EXISTS "authenticated_can_update_shifts" ON public.shifts;
DROP POLICY IF EXISTS "同じグループのシフトを誰でも閲覧できる" ON public.shifts;
DROP POLICY IF EXISTS "自分のシフトまたは管理者は削除可能" ON public.shifts;
DROP POLICY IF EXISTS "自分のシフトまたは管理者は更新可能" ON public.shifts;
DROP POLICY IF EXISTS "誰でもシフトを追加できる" ON public.shifts;

-- 置き換え: 現行アプリは anon のみで直接 CRUD（共有キーはアプリ側）。強化する場合は RPC 化を別途。
DROP POLICY IF EXISTS "shifts_anon_app_access" ON public.shifts;
CREATE POLICY "shifts_anon_app_access"
  ON public.shifts
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- public.staff
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all access to staff during development" ON public.staff;

DROP POLICY IF EXISTS "staff_anon_app_access" ON public.staff;
CREATE POLICY "staff_anon_app_access"
  ON public.staff
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
