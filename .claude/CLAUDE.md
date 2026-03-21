# Konbini Navi

コンビニ食事管理モバイルアプリ（Progate Hackathon 2026 AWS）

## プロジェクト構成
- `apps/mobile/` - Expo SDK 54 (React Native) + Expo Router v6
- `apps/api/` - Go 1.24 マイクロサービス (products, records, nutrition, recommendations)
- `apps/admin/` - Next.js 管理画面 (PostgreSQL CRUD)
- `packages/api-schema/` - OpenAPI 3.0 仕様 + TypeScript型生成
- `infra/` - AWS CDK (TypeScript)
- `data/` - シードデータ

## コーディング規約
- TypeScript: strict mode、関数コンポーネント + hooks
- Go: gofmt準拠、Clean Architecture (handler → service → repository)
- コミット: `[タグ] 要約` 形式 (feat/fix/docs/refactor/test/chore/infra)

## 型の共有
OpenAPI仕様 (`packages/api-schema/openapi.yaml`) を Single Source of Truth として:
- TypeScript側: `openapi-typescript` で型自動生成
- Go側: OpenAPI仕様に準拠した構造体を手動定義

## 重要な設計判断
- 認証: MVPではデバイスIDのみ（開発モードは dev-device-001 で自動ログイン）
- DB: PostgreSQL 15（Docker Compose でローカル起動）
- ルーター: 標準 http.ServeMux（Go 1.22+ パターン）
- サービス間通信: gRPC
- 本番環境: ap-northeast-1 (EKS + CodePipeline + ArgoCD)
- 栄養バランス: 摂取/目標比 <0.7=不足, 0.7-1.2=適量, >1.2=多い
