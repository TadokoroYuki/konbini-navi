# Konbini Navi データベーススキーマ

## 概要

PostgreSQL を使用。各マイクロサービスのデータオーナーシップは以下の通り。

| サービス | 所有テーブル | アクセス方法 |
|---|---|---|
| products | `products` | 直接 SQL |
| records | `records` | 直接 SQL |
| nutrition | なし | gRPC 経由で records を取得 |
| recommendations | `recommendations` | 直接 SQL + gRPC 経由で nutrition / products を取得 |

---

## products テーブル

**オーナー**: products サービス (:7111 / :7112)

商品マスタ。コンビニ商品の基本情報と栄養素データを保持する。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | SERIAL | NOT NULL | auto increment | 内部連番 (PK) |
| `product_id` | VARCHAR(255) | NOT NULL | - | 商品ID (UNIQUE, 外部公開キー) |
| `name` | VARCHAR(255) | NOT NULL | - | 商品名 |
| `brand` | VARCHAR(100) | NULL | - | コンビニブランド |
| `category` | VARCHAR(100) | NULL | - | 商品カテゴリ |
| `price` | INTEGER | NULL | 0 | 税込価格 (円) |
| `calories` | NUMERIC(10,2) | NULL | - | カロリー (kcal) |
| `protein` | NUMERIC(10,2) | NULL | - | タンパク質 (g) |
| `fat` | NUMERIC(10,2) | NULL | - | 脂質 (g) |
| `carbs` | NUMERIC(10,2) | NULL | - | 炭水化物 (g) |
| `fiber` | NUMERIC(10,2) | NULL | - | 食物繊維 (g) |
| `salt` | NUMERIC(10,2) | NULL | - | 食塩相当量 (g) |
| `image_url` | TEXT | NULL | - | 商品画像URL |
| `description` | TEXT | NULL | - | 商品説明 |
| `created_at` | TIMESTAMP | NULL | CURRENT_TIMESTAMP | 作成日時 |

### brand の値

| 値 | 説明 |
|---|---|
| `seven_eleven` | セブン-イレブン |
| `family_mart` | ファミリーマート |
| `lawson` | ローソン |

### category の値

| 値 | 説明 |
|---|---|
| `onigiri` | おにぎり |
| `bento` | 弁当 |
| `sandwich` | サンドイッチ |
| `salad` | サラダ |
| `soup` | スープ |
| `noodle` | 麺類 |
| `bread` | パン |
| `sweets` | スイーツ |
| `drink` | 飲料 |
| `side_dish` | 惣菜 |

### インデックス

| インデックス名 | カラム | 用途 |
|---|---|---|
| `products_pkey` | `id` | PRIMARY KEY |
| `products_product_id_key` | `product_id` | UNIQUE制約 |
| `idx_products_product_id` | `product_id` | 商品ID検索 |
| `idx_products_brand` | `brand` | ブランドフィルタ |
| `idx_products_category` | `category` | カテゴリフィルタ |
| `idx_products_brand_category` | `brand, category` | ブランド+カテゴリ複合フィルタ |

### 主なクエリ

```sql
-- 商品検索 (products サービス: handler.Search)
SELECT product_id, name, brand, category, price,
       calories, protein, fat, carbs, fiber, salt,
       image_url, description
FROM products
WHERE name ILIKE $1        -- キーワード検索 (任意)
  AND brand = $2           -- ブランドフィルタ (任意)
  AND category = $3        -- カテゴリフィルタ (任意)
LIMIT $4;

-- 商品取得 (products サービス: handler.Get, gRPC GetProduct)
SELECT product_id, name, brand, category, price,
       calories, protein, fat, carbs, fiber, salt,
       image_url, description
FROM products
WHERE product_id = $1;
```

---

## records テーブル

**オーナー**: records サービス (:8810 / :8811)

ユーザーの食事記録。どのユーザーがいつ何を食べたかを保持する。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `id` | SERIAL | NOT NULL | auto increment | 内部連番 (PK) |
| `user_id` | VARCHAR(255) | NOT NULL | - | ユーザーID (デバイスID) |
| `record_id` | VARCHAR(255) | NOT NULL | - | 記録ID (ULID, UNIQUE) |
| `product_id` | VARCHAR(255) | NOT NULL | - | 商品ID (FK → products.product_id) |
| `date` | DATE | NOT NULL | - | 食事日 (YYYY-MM-DD) |
| `meal_type` | VARCHAR(50) | NOT NULL | 'snack' | 食事タイプ |
| `created_at` | TIMESTAMP | NULL | CURRENT_TIMESTAMP | 作成日時 |

### meal_type の値

| 値 | 説明 |
|---|---|
| `breakfast` | 朝食 |
| `lunch` | 昼食 |
| `dinner` | 夕食 |
| `snack` | 間食 |

### 外部キー

| 制約名 | カラム | 参照先 |
|---|---|---|
| `records_product_id_fkey` | `product_id` | `products(product_id)` |

### インデックス

| インデックス名 | カラム | 用途 |
|---|---|---|
| `records_pkey` | `id` | PRIMARY KEY |
| `records_record_id_key` | `record_id` | UNIQUE制約 |
| `idx_records_user_id` | `user_id` | ユーザー別検索 |
| `idx_records_date` | `date` | 日付検索 |
| `idx_records_user_date` | `user_id, date` | ユーザー+日付 (最頻出クエリ) |
| `idx_records_record_id` | `record_id` | 記録ID検索 |

### 主なクエリ

```sql
-- 記録一覧 (records サービス: handler.List, gRPC ListRecords)
SELECT record_id, user_id, product_id, date, meal_type, created_at
FROM records
WHERE user_id = $1 AND date = $2
ORDER BY created_at DESC;

-- 記録作成 (records サービス: handler.Create, gRPC CreateRecord)
INSERT INTO records (record_id, user_id, product_id, date, meal_type, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- 記録削除 (records サービス: handler.Delete, gRPC DeleteRecord)
DELETE FROM records
WHERE user_id = $1 AND record_id = $2;
```

---

## recommendations テーブル

**オーナー**: recommendations サービス (:2525)

事前計算されたおすすめ商品キャッシュ。ユーザーが records を CRUD したタイミングで該当 user_id のレコメンドを再計算・上書き保存する。user_id が PK なので1ユーザー1行。

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| `user_id` | VARCHAR(255) | NOT NULL | - | ユーザーID (PK) |
| `product_id` | VARCHAR(255) | NOT NULL | - | おすすめ商品ID (FK → products.product_id) |
| `date` | DATE | NOT NULL | - | 対象日 (YYYY-MM-DD) |
| `score` | NUMERIC(10,2) | NULL | - | おすすめスコア |
| `created_at` | TIMESTAMP | NULL | CURRENT_TIMESTAMP | 作成日時 |

### 外部キー

| 制約名 | カラム | 参照先 |
|---|---|---|
| `recommendations_product_id_fkey` | `product_id` | `products(product_id)` |

### インデックス

| インデックス名 | カラム | 用途 |
|---|---|---|
| `recommendations_pkey` | `user_id` | PRIMARY KEY |

### 主なクエリ

```sql
-- おすすめ取得
SELECT user_id, product_id, date, score
FROM recommendations
WHERE user_id = $1;

-- おすすめ保存 (UPSERT: 存在すれば上書き)
INSERT INTO recommendations (user_id, product_id, date, score)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  date = EXCLUDED.date,
  score = EXCLUDED.score,
  created_at = CURRENT_TIMESTAMP;
```

---

## ER図

```
┌──────────────────────────┐         ┌──────────────────────────┐
│        products          │         │         records          │
├──────────────────────────┤         ├──────────────────────────┤
│ id          SERIAL    PK │         │ id          SERIAL    PK │
│ product_id  VARCHAR  UNQ │◄───FK───│ product_id  VARCHAR      │
│ name        VARCHAR      │         │ record_id   VARCHAR  UNQ │
│ brand       VARCHAR      │         │ user_id     VARCHAR      │
│ category    VARCHAR      │    ┌────│ date        DATE         │
│ price       INTEGER      │    │    │ meal_type   VARCHAR      │
│ calories    NUMERIC      │    │    │ created_at  TIMESTAMP    │
│ protein     NUMERIC      │    │    └──────────────────────────┘
│ fat         NUMERIC      │    │
│ carbs       NUMERIC      │    │    ┌──────────────────────────────┐
│ fiber       NUMERIC      │    │    │      recommendations         │
│ salt        NUMERIC      │    │    ├──────────────────────────────┤
│ image_url   TEXT         │    │    │      recommendations         │
│ description TEXT         │◄───FK───├──────────────────────────────┤
│ created_at  TIMESTAMP    │         │ user_id     VARCHAR      PK  │
└──────────────────────────┘         │ product_id  VARCHAR          │
                                     │ date        DATE             │
                                     │ score       NUMERIC          │
                                     │ created_at  TIMESTAMP        │
                                     └──────────────────────────────┘
```

---

## サービス間データフロー

```
[products テーブル]              [records テーブル]
       │                               │
       ▼                               ▼
  products サービス              records サービス
   (SQL直接)                     (SQL直接)
       │                               │
       │ gRPC: GetProduct              │ gRPC: ListRecords
       │ gRPC: SearchProducts          │  (各recordに商品情報を付与)
       │                               │
       ├───────────┐                   │
       │           ▼                   ▼
       │     records サービス    nutrition サービス
       │      (商品確認)         (栄養計算 = DB不要)
       │                               │
       │                               │ gRPC: GetNutrition
       │                               ▼
       └──────────────────► recommendations サービス
              gRPC:              (おすすめ算出 + DB保存)
          SearchProducts
```

---

## 接続情報

### ローカル (docker-compose)

```
DATABASE_URL=postgres://postgres:postgres@postgres:5432/konbini_navi?sslmode=disable
```

- **products サービス**: 上記URLで直接接続
- **records サービス**: 上記URLで直接接続
- **nutrition サービス**: DB接続なし
- **recommendations サービス**: 上記URLで直接接続

### テーブル初期化

`apps/api/migrations/001_init.sql` が docker-compose の `docker-entrypoint-initdb.d` にマウントされ、PostgreSQL 初回起動時に自動実行される。
