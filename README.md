# シフトメーカー (Shift Maker)

シフトメーカーは、スタッフのシフト希望を簡単に収集・管理できるウェブアプリケーションです。スタッフは希望のシフトを入力し、管理者は日付範囲の設定やスタッフ追加、シフトの確認・一括操作などができます。

## デモサイト

[https://shift-maker-nu.vercel.app](https://shift-maker-nu.vercel.app)

### テストアクセス情報

デモ環境にテスト用キーが用意されている場合の例（運用側のデータに依存します）:

- スタッフ用アクセスキー: `testgroup`
- 管理者キー: `testadmin`

新規に試す場合は、トップ画面の「グループを作成」でグループを作り、表示されるアクセスキー／管理者キーを利用してください。

## 主な機能

- **シフト希望の入力**: スタッフ画面で日ごとの勤務可否・時間帯・メモを入力
- **グループ単位の利用**: アクセスキー（スタッフ向け）と管理者キー（管理画面向け）でグループに入室
- **管理者機能**: 日付範囲の設定、スタッフ追加、シフト一括操作、確定状態の切り替えなど
- **入室状態の保持**: ブラウザの `localStorage` にグループ情報を保存（キーは端末に残るため共有端末に注意）
- **メンテナンス表示**: 環境変数でメンテナンスページに切り替え可能
- **レスポンシブデザイン**: スマートフォン・タブレット・PC に対応

## 技術スタック

- **フロントエンド**: Next.js 15.2.x、React 19、TypeScript、Tailwind CSS
- **データ**: Supabase（PostgreSQL）、`@supabase/supabase-js`（ブラウザから PostgREST / RPC を利用）
- **認証・入室**: **Supabase Authentication は使用していません。** アクセスキー／管理者キーと `GroupContext`（`localStorage` の `groupAccess`）でグループにアクセスします。
- **データベース側**: `groups` テーブルは RLS で直接参照を制限し、キー検証・グループ作成などは **RPC（`SECURITY DEFINER`）** 経由（マイグレーション参照）

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 18 以上
- npm または yarn
- （Supabase を自前で立てる場合）Supabase CLI など

### インストール手順

1. リポジトリをクローン

```bash
git clone https://github.com/KamineHiro/shift-maker.git
cd shift-maker
```

2. 依存パッケージをインストール

```bash
npm install
```

3. 環境変数の設定

プロジェクト直下に `.env.local` を作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

任意:

```env
# true のときメンテナンスページのみ表示
NEXT_PUBLIC_MAINTENANCE_MODE=false
```

4. Supabase のスキーマを適用

リモートの Supabase プロジェクトに、リポジトリ内のマイグレーションを順に適用してください。

- CLI: `supabase link` 後に `supabase db push`
- またはダッシュボードの **SQL Editor** に `supabase/migrations/` 内の SQL を**ファイル名の古い順**で実行

本番・デモ環境でも、**アプリのデプロイと同じ Supabase にマイグレーションが当たっているか**を確認してください（未適用だとキー入室や日付範囲が動かないことがあります）。

5. 開発サーバー起動

```bash
npm run dev
```

6. ブラウザで http://localhost:3000 を開く

## プロジェクト構成

```
/src
  /app              # App Router（ページ）
  /components       # UI コンポーネント
  /contexts         # GroupContext など
  /hooks            # useApi など
  /lib              # Supabase クライアント等
  /services         # groupService, supabaseService など
  /types            # 型定義
/supabase
  /migrations       # PostgreSQL マイグレーション（RLS・RPC 含む）
```

## デプロイ

Vercel など Next.js 対応ホスティングにデプロイ可能です。環境変数に **`NEXT_PUBLIC_SUPABASE_URL`** と **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**（本番プロジェクトの値）を設定し、**Supabase 側へマイグレーションを適用**したうえで公開してください。

現在のデプロイ例: [https://shift-maker-nu.vercel.app](https://shift-maker-nu.vercel.app)

```bash
vercel
```

## ライセンス

MIT

## 作者

- KamineHiro
