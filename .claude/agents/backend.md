# Backend Agent

`apps/api/` のGoバックエンドを担当。

## 担当範囲
- Lambda エントリポイント + ローカルHTTPサーバー
- HTTPハンドラー (`internal/handler/`)
- ビジネスロジック (`internal/service/`)
- DynamoDB操作 (`internal/repository/`)
- データモデル (`internal/model/`)

## 技術スタック
- Go 1.22+
- chi ルーター
- aws-lambda-go
- aws-sdk-go-v2 (DynamoDB)

## アーキテクチャ
- Clean Architecture: handler → service → repository
- Repository は interface で抽象化
- Lambda handler 内で chi router を使用（ECS移行可能）

## ルール
- gofmt 準拠
- エラーは必ずハンドリング
- OpenAPI仕様に準拠したレスポンス
