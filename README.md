# シフトメーカー (Shift Maker)

シフトメーカーは、スタッフのシフト希望を簡単に収集・管理できるウェブアプリケーションです。スタッフは希望のシフトを入力し、管理者はそれらを確認して最終的なシフト表を作成できます。

## デモサイト

アプリケーションのデモは以下のURLでアクセスできます：
[https://shift-maker-nu.vercel.app](https://shift-maker-nu.vercel.app)

### テストアクセス情報

デモサイトを試すための情報:
- テストグループへのアクセスキー: `testgroup`
- 管理者キー: `testadmin`

## 主な機能

- **シフト希望の管理**: スタッフは日ごとの勤務可否や時間帯を入力できます
- **グループ管理**: 複数のスタッフをグループとして管理できます
- **シフト確認・承認**: 管理者はスタッフのシフト希望を確認し、最終的なシフトを設定できます
- **レスポンシブデザイン**: スマートフォン、タブレット、PCなど様々なデバイスに対応

## 技術スタック

- **フロントエンド**:
  - Next.js 15.2.2
  - React 19
  - TypeScript
  - Tailwind CSS

- **バックエンド**:
  - Supabase (PostgreSQL)
  - Next.js API Routes

- **認証**:
  - Supabase Authentication

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 18.0.0以上
- npm または yarn

### インストール手順

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/shift-maker.git
cd shift-maker-project
```

2. 依存パッケージをインストール
```bash
npm install
# または
yarn install
```

3. 環境変数の設定
`.env.local`ファイルを作成し、以下の内容を設定:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. 開発サーバーを起動
```bash
npm run dev
# または
yarn dev
```

5. ブラウザで http://localhost:3000 にアクセス

## プロジェクト構成

```
/src
  /app          # Next.jsのページコンポーネント
  /components   # 再利用可能なコンポーネント
  /contexts     # Reactコンテキスト
  /hooks        # カスタムフック
  /lib          # ユーティリティ関数
  /services     # APIサービス
  /types        # TypeScript型定義
```

## デプロイ

このアプリケーションはVercelなどのNext.js対応のホスティングサービスに簡単にデプロイできます。

現在のデプロイ先:
- [https://shift-maker-nu.vercel.app](https://shift-maker-nu.vercel.app)

```bash
# Vercelへのデプロイ例
vercel
```

## ライセンス

MIT

## 作者

- KamineHiro
