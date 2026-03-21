# デバッグ・動作確認ガイド

## 前提条件

- Node.js v22+
- pnpm v10+
- Go v1.24+
- Docker (PostgreSQL + マイクロサービス起動用)
- Expo Go アプリ（iOS / Android）

## セットアップ

```bash
git clone https://github.com/TadokoroYuki/konbini-navi.git
cd konbini-navi
pnpm install
pnpm generate:types
cd apps/api && go mod download && cd ../..
```

## モバイルアプリの動作確認

### ブラウザ（Web）で確認

```bash
cd apps/mobile
npx expo start --web
```

http://localhost:8081 をブラウザで開く。

### スマホ（Expo Go）で確認

#### 方法1: LAN接続（同じWi-Fi）

```bash
cd apps/mobile
npx expo start
```

ターミナルにQRコードが表示されるので：
- **iOS**: カメラアプリでQRコードをスキャン
- **Android**: Expo Goアプリで「Scan QR code」

#### 方法2: Tunnel接続（推奨）

LANでタイムアウトする場合はtunnelモードを使用：

```bash
cd apps/mobile
npx expo start --tunnel
```

初回は `@expo/ngrok` のインストールを求められるので `y` で許可。

> **Tips**: tunnelモードはWi-Fiの制約やファイアウォールに影響されないため、確実に接続できます。

### モックデータ

APIサーバーが起動していない場合でも、アプリはモックデータで動作します。
モックデータは `apps/mobile/lib/mock-data.ts` に定義されています。

## Go API の動作確認

### ローカル起動

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

### APIテスト

```bash
# 商品検索
curl http://localhost:7111/v1/products?q=おにぎり

# 商品詳細
curl http://localhost:7111/v1/products/prod_001

# 食事記録一覧
curl http://localhost:8810/v1/users/test-device/records?date=2026-03-17

# 食事記録作成
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_001","date":"2026-03-17","mealType":"lunch"}' \
  http://localhost:8810/v1/users/test-device/records

# 栄養バランス
curl http://localhost:1056/v1/users/test-device/nutrition?date=2026-03-17

# おすすめ
curl http://localhost:2525/v1/users/test-device/recommendations?date=2026-03-17
```

> **注意**: ローカルではPostgreSQLが必要です。`docker compose up` で自動的に起動します。

## CDK の確認

```bash
cd infra
npx cdk synth
```

CloudFormationテンプレートが生成されれば成功です。

## ビルド確認

### 全体ビルド

```bash
pnpm build
```

### 個別ビルド

```bash
# TypeScript型生成
pnpm generate:types

# モバイルアプリ型チェック
cd apps/mobile && npx tsc --noEmit

# Go APIビルド
cd apps/api && go build ./...

# CDKビルド
cd infra && npx tsc --noEmit
```

## トラブルシューティング

### Expo Goで「Project is incompatible」

プロジェクトのExpo SDKバージョンとExpo Goアプリのバージョンが一致しているか確認してください。
SDK 54を使用しています。Expo Goアプリを最新に更新してください。

### Expo Goで「The request timed out」

LAN接続がブロックされている可能性があります。`--tunnel` モードで起動してください：

```bash
npx expo start --tunnel
```

### `pnpm install` でエラー

Node.js v22以上がインストールされているか確認：

```bash
node -v  # v22.x.x であること
```

### Go buildでエラー

```bash
go version  # v1.24以上であること
cd apps/api && go mod tidy
```
