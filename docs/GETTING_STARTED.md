# 環境構築手順

## 前提条件

- **Node.js** v22+
- **pnpm** v10+
- **Go** v1.24+
- **Docker** (ローカル開発でPostgreSQL + マイクロサービスを起動)
- **AWS CLI** v2 (CDK deploy時に必要)
- **Expo Go** アプリ (iOS/Android端末にインストール)

## セットアップ

### 1. リポジトリクローン

```bash
git clone https://github.com/TadokoroYuki/konbini-navi.git
cd konbini-navi
```

### 2. 依存関係インストール

```bash
pnpm install
```

### 3. 型生成

```bash
pnpm generate:types
```

### 4. Goの依存関係

```bash
cd apps/api
go mod download
cd ../..
```

## ローカル開発

### モバイルアプリ

```bash
cd apps/mobile
npx expo start
```

Expo Go アプリでQRコードをスキャンして確認。

**開発環境では認証をスキップ**し、固定のdevユーザー（`dev-device-001`）で自動ログインされます。ログイン画面を経ずにアプリを利用できます。

### Go API + PostgreSQL (ローカル)

```bash
# プロジェクトルートで Docker Compose を起動
docker compose up
```

以下のサービスが起動します:
- **products**: http://localhost:7111
- **records**: http://localhost:8810
- **nutrition**: http://localhost:1056
- **recommendations**: http://localhost:2525
- **Swagger UI**: http://localhost:8082
- **PostgreSQL**: localhost:5432

### CDK

```bash
cd infra
npx cdk synth    # テンプレート生成確認
npx cdk deploy   # AWSにデプロイ
```

## 環境変数

### apps/mobile

`app.config.ts` 内で環境に応じたAPI URLを設定：

- 開発: 各マイクロサービスのポート (products:7111, records:8810, nutrition:1056, recommendations:2525)
- 本番: API Gatewayのエンドポイント

## トラブルシューティング

### `pnpm install` が失敗する
Node.js v22以上がインストールされているか確認してください。

### Expo Goで接続できない
同じWi-Fiネットワークに接続されているか確認してください。

### Go buildが失敗する
`go version` で v1.24以上か確認してください。
