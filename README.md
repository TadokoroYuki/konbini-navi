# konbini-navi

> コンビニでも健康に生きる。

Progate Hackathon 2026（AWS）プロジェクト。コンビニ食品の栄養バランスを管理するモバイルアプリ。

## 機能

- **食事記録**: コンビニ商品を検索して食事を記録
- **栄養バランス表示**: 1日のPFC（タンパク質・脂質・炭水化物）目標vs実績
- **おすすめ商品提案**: 不足栄養素を補う商品をルールベースで提案

## 技術スタック

| 領域 | 技術 |
|------|------|
| モバイル | Expo SDK 52 + Expo Router v4 |
| バックエンド | Go (Lambda) + chi router |
| インフラ | AWS CDK (API Gateway + Lambda + DynamoDB) |
| 型共有 | OpenAPI 3.0 + openapi-typescript |
| モノレポ | pnpm workspace + Turborepo |

## プロジェクト構成

```
konbini-navi/
├── apps/
│   ├── mobile/          # Expo (React Native) モバイルアプリ
│   └── api/             # Go バックエンド (Lambda)
├── packages/
│   └── api-schema/      # OpenAPI仕様 + TypeScript型生成
├── infra/               # AWS CDK
├── data/                # シードデータ (コンビニ商品60件)
└── docs/                # ドキュメント
```

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 型生成
pnpm generate:types

# Go依存関係
cd apps/api && go mod download

# モバイルアプリ起動
cd apps/mobile && npx expo start

# Go APIローカル起動
cd apps/api && go run cmd/lambda/main.go
```

詳細は [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) を参照。

## ドキュメント

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - アーキテクチャ概要
- [GETTING_STARTED.md](docs/GETTING_STARTED.md) - 環境構築手順
- [API_SPEC.md](docs/API_SPEC.md) - API仕様書
- [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) - 開発ガイド
