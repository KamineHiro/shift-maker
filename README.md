# シフト作成アプリ

シフト作成アプリは、グループを作成してURLを共有するだけで、簡単にシフト希望を管理できるツールです。

## 機能

- **グループ作成**: 誰でも新しいグループを作成できます
- **簡単アクセス**: アクセスキーを共有するだけで、メンバーをグループに招待できます
- **シフト希望入力**: メンバーは簡単にシフト希望を入力できます
- **管理者機能**: 管理者はすべてのメンバーのシフトを一覧で確認・編集できます

## 技術スタック

- **フロントエンド**
  - Next.js 15.2.2
  - React 19
  - TypeScript
  - Tailwind CSS
  - DaisyUI
  - Headless UI
  - Hero Icons
- **バックエンド/データベース**
  - Supabase (PostgreSQLデータベース)

## セットアップ

### 環境変数

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseのURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabaseの匿名キー
```

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

## データベース設定

Supabaseで以下のテーブルを作成してください：

### groupsテーブル

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  access_key TEXT NOT NULL UNIQUE,
  admin_key TEXT NOT NULL UNIQUE,
  admin_password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### staffテーブル

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  group_id UUID REFERENCES groups(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### shiftsテーブル

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_off BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, date)
);
```

## 使い方

1. トップページでグループを作成するか、既存のグループにアクセスします
2. グループを作成した場合は、管理者キーを安全に保管してください
3. アクセスキーを共有して、メンバーをグループに招待します
4. メンバーはアクセスキーを使ってグループにアクセスし、シフト希望を入力できます
5. 管理者は管理者キーを使って管理画面にアクセスし、すべてのシフトを管理できます

## Supabaseの設定

1. [Supabase](https://supabase.com/)にアクセスして、アカウントを作成します。
2. 新しいプロジェクトを作成します。
3. プロジェクトが作成されたら、以下のテーブルを作成します：

### staffテーブル
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### shiftsテーブル
```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  is_off BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(staff_id, date)
);
```

4. プロジェクトの設定から、API URLとAnon Keyを取得します。
5. `.env.local`ファイルに以下の環境変数を設定します：

```
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase Anon Key
```

## 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```