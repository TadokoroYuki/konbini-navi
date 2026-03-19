# デバッグ・動作確認ガイド

## 前提条件

- Node.js v22+
- pnpm v10+
- Go v1.22+
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
cd apps/api
go run cmd/lambda/main.go
```

ポート8080でHTTPサーバーが起動します。

### APIテスト

```bash
# 商品検索
curl http://localhost:8080/v1/products?q=おにぎり

# 商品詳細
curl http://localhost:8080/v1/products/prod_001

# 食事記録一覧
curl -H "X-Device-Id: test-device" \
  http://localhost:8080/v1/users/test-device/records?date=2026-03-17

# 食事記録作成
curl -X POST -H "X-Device-Id: test-device" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_001","date":"2026-03-17","mealType":"lunch"}' \
  http://localhost:8080/v1/users/test-device/records

# 栄養バランス
curl -H "X-Device-Id: test-device" \
  http://localhost:8080/v1/users/test-device/nutrition?date=2026-03-17

# おすすめ
curl -H "X-Device-Id: test-device" \
  http://localhost:8080/v1/users/test-device/recommendations?date=2026-03-17
```

> **注意**: ローカルではDynamoDBが必要です。DynamoDBが接続できない場合はエラーになります。

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
go version  # v1.22以上であること
cd apps/api && go mod tidy
```
