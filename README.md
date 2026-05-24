# myplace

あなただけの心の部屋。感情を記録し、AIソウルメイトと対話するパーソナルスペース。

## 技術スタック

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (認証 / DB)
- **Zustand** (状態管理)
- **Anthropic API** (AIソウルメイト)

## 起動方法

### 1. 環境変数を設定

`.env.local` を編集して実際の値を入力してください：

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、自動的に `/room` にリダイレクトされます。

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx        # ログインページ
│   ├── (main)/
│   │   ├── room/
│   │   │   └── page.tsx        # マイルーム（心の部屋）
│   │   ├── chat/
│   │   │   └── page.tsx        # チャット
│   │   └── profile/
│   │       └── page.tsx        # プロフィール
│   ├── layout.tsx
│   └── page.tsx                # / → /room にリダイレクト
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── Input.tsx
│   ├── room/
│   │   └── RoomCanvas.tsx
│   ├── chat/
│   │   └── ChatWindow.tsx
│   └── post/
│       └── PostBubble.tsx
├── lib/
│   └── supabase/
│       ├── client.ts           # ブラウザ用クライアント
│       └── server.ts           # サーバー用クライアント
├── store/
│   ├── useRoomStore.ts         # Zustand: マイルーム状態
│   └── usePostStore.ts         # Zustand: 投稿状態
└── types/
    └── index.ts                # 共通型定義
```

## 主要コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run lint     # ESLintチェック
```
