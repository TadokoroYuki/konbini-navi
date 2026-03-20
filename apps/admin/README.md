# Konbini Navi Admin

PostgreSQL CRUD 管理画面（Next.js）

## 起動方法

```bash
cd apps/admin
npm install
npm run dev
```

開発サーバーは `http://localhost:3001` で起動します。

### 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `DATABASE_URL` | PostgreSQL接続文字列 | `postgres://postgres:postgres@localhost:5432/konbini_navi` |

## 機能一覧

### 商品管理 (`/products`)
- 商品一覧表示（ID, product_id, name, brand, category, price, 栄養素）
- 商品新規登録 (`/products/new`)
- 商品編集 (`/products/[id]/edit`)
- 商品削除

### 記録管理 (`/records`)
- 記録一覧表示（ID, record_id, user_id, product_id, date, meal_type, created_at）
- 記録新規登録 (`/records/new`)
- 記録編集 (`/records/[id]/edit`)
- 記録削除

## 技術スタック

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- PostgreSQL (`pg` パッケージ)

## アーキテクチャ備考

現在、admin画面は PostgreSQL に直接接続しています（`src/lib/db.ts`）。
将来的には、マイクロサービス API (`apps/api`) 経由でデータアクセスする構成に移行することを推奨します。

### 移行方針
1. `apps/api` の各サービス（products, records）が提供する REST/gRPC API を利用する
2. `src/lib/actions/` 内の Server Actions を、直接 SQL から API 呼び出しに置き換える
3. `src/lib/db.ts` の直接 DB 接続を廃止する

これにより、データアクセスの一元化・認証認可の統一・スキーマ変更の影響範囲の制限が実現できます。
