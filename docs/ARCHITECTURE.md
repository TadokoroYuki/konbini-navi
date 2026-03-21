# アーキテクチャ概要

## システム全体図

```
┌──────────────┐     ┌──────────────────────────────────────────────┐     ┌────────────┐
│  Expo Mobile │────▶│  Go マイクロサービス                           │────▶│ PostgreSQL │
│  (React      │     │                                              │     │ (15-alpine)│
│   Native)    │     │  products (:7111)  ◄──gRPC──┐                │     └────────────┘
└──────────────┘     │  records  (:8810)  ──gRPC──▶ products        │
                     │  nutrition(:1056)  ──gRPC──▶ records         │
                     │  recommend(:2525)  ──gRPC──▶ nutrition,      │
                     │                              products        │
                     └──────────────────────────────────────────────┘
```

## モノレポ構成

```
konbini-navi/
├── apps/
│   ├── mobile/          # Expo (React Native) + Expo Router
│   ├── api/             # Go マイクロサービス (4サービス)
│   └── admin/           # Next.js 管理画面 (PostgreSQL CRUD)
├── packages/
│   └── api-schema/      # OpenAPI仕様 + TypeScript型生成
├── infra/               # AWS CDK (TypeScript)
├── data/                # シードデータ
└── docs/                # ドキュメント
```

## 各パッケージの役割

### apps/mobile
- **Expo SDK 54 + Expo Router v6** によるモバイルアプリ
- Bottom Tab Navigator で4画面（ホーム/記録/履歴/おすすめ）
- `api-schema` パッケージの型を使ってAPIクライアントを実装

### apps/api
- **Go 1.24** による4つのマイクロサービス
- 標準 `http.ServeMux` でHTTPルーティング（Go 1.22+ パターン）
- サービス間通信に **gRPC** を使用
- Clean Architecture: handler → service → repository の3層分離
- **PostgreSQL** をデータストアとして使用

#### サービス一覧
| サービス | HTTP | gRPC | 役割 |
|----------|------|------|------|
| products | :7111 | :7112 | 商品検索・詳細 |
| records | :8810 | :8811 | 食事記録CRUD |
| nutrition | :1056 | :1057 | 栄養バランス計算 |
| recommendations | :2525 | - | おすすめ商品提案 |

### apps/admin
- **Next.js** による管理画面
- PostgreSQL に対する商品・記録データの CRUD

### packages/api-schema
- **OpenAPI 3.0** 仕様定義
- `openapi-typescript` でTypeScript型を自動生成
- フロントエンドとバックエンド間の型の一貫性を保証

### infra/
- **AWS CDK (TypeScript)** によるインフラ定義
- VPC、ECR、Cognito を管理
- 注: EKS クラスタや CI/CD パイプラインは eksctl / CDK 別スタックで構築済み

### data/
- AI生成したコンビニ商品マスタデータ（60件）
- PostgreSQL へのシードデータ（Docker起動時にマイグレーションで投入）

## PostgreSQL テーブル設計

### products
| カラム | 型 | 説明 |
|--------|------|------|
| id | SERIAL PK | 自動採番 |
| product_id | VARCHAR(255) UNIQUE | 商品ID |
| name | VARCHAR(255) | 商品名 |
| brand | VARCHAR(100) | ブランド |
| category | VARCHAR(100) | カテゴリ |
| price | INTEGER | 価格 |
| calories, protein, fat, carbs, fiber, salt | NUMERIC(10,2) | 栄養素 |
| image_url | TEXT | 画像URL |

### records
| カラム | 型 | 説明 |
|--------|------|------|
| id | SERIAL PK | 自動採番 |
| user_id | VARCHAR(255) | ユーザーID |
| record_id | VARCHAR(255) UNIQUE | 記録ID (ULID) |
| product_id | VARCHAR(255) FK | 商品ID |
| date | DATE | 日付 |
| meal_type | VARCHAR(50) | 食事タイプ |

**インデックス**: brand, category, brand+category, user_id, date, user_id+date

## AWS 本番環境 (ap-northeast-1)

```
┌──────────┐     ┌──────────────┐     ┌─────────────────────────────┐
│  GitHub  │────▶│  CodePipeline│────▶│  CodeBuild                  │
│          │     │              │     │  (Docker build + ECR push)  │
└──────────┘     └──────────────┘     └──────────┬──────────────────┘
                                                  │
                                                  ▼
┌──────────┐     ┌──────────────┐     ┌──────────────────┐
│  Expo    │────▶│  EKS         │◄────│  ArgoCD          │
│  Mobile  │     │  (k8s 1.31)  │     │  Image Updater   │
└──────────┘     │  t3.medium x2│     └──────────────────┘
                 └──────────────┘
```

### リソース一覧

| リソース | 名前 | 詳細 |
|----------|------|------|
| EKS | `konbini-navi-cluster` | Kubernetes 1.31, t3.medium x2ノード |
| VPC | `10.0.0.0/16` | 2AZ, Public/Private subnet, NAT Gateway |
| ECR | `konbini-navi-api` | Docker イメージリポジトリ |
| CodePipeline | `konbini-navi-pipeline` | GitHub → CodeBuild → ECR |
| CodeBuild | `konbini-navi-build` | Docker ビルド & プッシュ |
| ArgoCD | `ArgoCDImageUpdaterStack` | GitOps によるデプロイ |

### CDK スタック構成

| スタック | リージョン | 内容 |
|----------|-----------|------|
| `KonbiniNaviStack` | ap-northeast-1 | VPC, ECR, Cognito |
| `KonbiniNaviCiCdStack` | ap-northeast-1 | CodePipeline, CodeBuild, GitHub接続 |
| `ArgoCDImageUpdaterStack` | ap-northeast-1 | ArgoCD Image Updater |
| `eksctl-konbini-navi-cluster-*` | ap-northeast-1 | EKS クラスタ (eksctl管理) |

> **注意**: us-east-1 にも旧アーキテクチャ (Lambda + API Gateway + DynamoDB) の残骸が存在するが、
> 現在は未使用。削除予定。

## 栄養バランス計算ロジック

```
摂取量/目標量:
  < 0.7  → "不足" (deficient)
  0.7〜1.2 → "適量" (adequate)
  > 1.2  → "多い" (excessive)

デフォルト目標: calories=2000kcal, protein=65g, fat=55g, carbs=300g
```
