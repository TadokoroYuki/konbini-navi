# アーキテクチャ概要

## システム全体図

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│  Expo Mobile │────▶│  API Gateway   │────▶│  Lambda (Go)     │
│  (React      │     │  (REST)        │     │                  │
│   Native)    │     └────────────────┘     │  ├─ handler/     │
└──────────────┘                            │  ├─ service/     │
                                            │  └─ repository/  │
                                            └──────┬───────────┘
                                                   │
                                            ┌──────▼───────────┐
                                            │  DynamoDB         │
                                            │  ├─ products      │
                                            │  └─ records       │
                                            └──────────────────┘
```

## モノレポ構成

```
konbini-navi/
├── apps/
│   ├── mobile/          # Expo (React Native) + Expo Router
│   └── api/             # Go バックエンド (Lambda)
├── packages/
│   └── api-schema/      # OpenAPI仕様 + TypeScript型生成
├── infra/               # AWS CDK (TypeScript)
├── data/                # シードデータ
└── docs/                # ドキュメント
```

## 各パッケージの役割

### apps/mobile
- **Expo SDK 52 + Expo Router v4** によるモバイルアプリ
- Bottom Tab Navigator で4画面（ホーム/記録/履歴/おすすめ）
- `api-schema` パッケージの型を使ってAPIクライアントを実装

### apps/api
- **Go** による Lambda バックエンド
- `chi` ルーターで API Gateway proxy integration に対応
- Clean Architecture: handler → service → repository の3層分離
- DynamoDB をデータストアとして使用

### packages/api-schema
- **OpenAPI 3.0** 仕様定義
- `openapi-typescript` でTypeScript型を自動生成
- フロントエンドとバックエンド間の型の一貫性を保証

### infra/
- **AWS CDK (TypeScript)** によるインフラ定義
- DynamoDB テーブル、API Gateway、Lambda を一括管理

### data/
- AI生成したコンビニ商品マスタデータ（50-100件）
- DynamoDB へのシードスクリプト

## DynamoDB テーブル設計

### konbini-products
| キー | 属性 |
|------|------|
| PK | `productId` |
| GSI: `brand-category-index` | PK=`brand`, SK=`category` |

### konbini-records
| キー | 属性 |
|------|------|
| PK | `userId` |
| SK | `{date}#{ulid}` |
| GSI: `userId-date-index` | PK=`userId`, SK=`date` |

## 栄養バランス計算ロジック

```
摂取量/目標量:
  < 0.7  → "不足" (deficient)
  0.7〜1.2 → "適量" (adequate)
  > 1.2  → "多い" (excessive)

デフォルト目標: calories=2000kcal, protein=65g, fat=55g, carbs=300g
```
