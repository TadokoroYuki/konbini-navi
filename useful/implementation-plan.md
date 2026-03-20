# Konbini Navi API 実装計画

## 概要

OpenAPI仕様をベースに、4つの独立したマイクロサービスとして Go + net/http + gRPC で実装する。
外部（モバイルアプリ）向けは HTTP/JSON、サービス間通信は gRPC。

---

## アーキテクチャ

### 全体構成

```
モバイルアプリ (Expo)
    │
    │  HTTP/JSON (REST)
    ▼
┌─────────────────────────────────────────────────┐
│  K8s Ingress                                     │
│  /v1/products/**       → products service        │
│  /v1/users/*/records/* → records service          │
│  /v1/users/*/nutrition → nutrition service         │
│  /v1/users/*/recommendations → recommendations   │
└─────────────────────────────────────────────────┘
    │           │            │             │
    ▼           ▼            ▼             ▼
 products    records     nutrition   recommendations
  :7111       :8810       :1056         :2525
    │           │
    ▼           ▼
 [products]  [records]     ← PostgreSQL テーブル
  テーブル     テーブル
```

### サービス間 gRPC 依存関係

```
products       ← 依存なし（独立）
  ↑ gRPC
records        ← products の商品情報を gRPC で取得
  ↑ gRPC
nutrition      ← records の記録一覧を gRPC で取得（商品情報付き）
  ↑ gRPC
recommendations ← nutrition の計算結果を gRPC で取得
                ← products の商品一覧を gRPC で取得
```

### データオーナーシップ

| サービス | 所有テーブル | 他サービスのデータ取得方法 |
|---|---|---|
| products | `products` | なし |
| records | `records` | products → gRPC |
| nutrition | なし（計算のみ） | records → gRPC |
| recommendations | なし（計算のみ） | nutrition → gRPC, products → gRPC |

---

## ディレクトリ構成

```
apps/api/
├── proto/                              # Protocol Buffers 定義
│   ├── product/
│   │   └── product.proto               #   GetProduct, SearchProducts
│   ├── record/
│   │   └── record.proto                #   ListRecords, CreateRecord, DeleteRecord
│   └── nutrition/
│       └── nutrition.proto             #   GetNutrition
│
├── gen/                                # protoc 自動生成コード (git管理する)
│   ├── product/
│   │   ├── product.pb.go
│   │   └── product_grpc.pb.go
│   ├── record/
│   │   ├── record.pb.go
│   │   └── record_grpc.pb.go
│   └── nutrition/
│       ├── nutrition.pb.go
│       └── nutrition_grpc.pb.go
│
├── pkg/                                # 共有パッケージ
│   ├── model/                          #   ドメインモデル (Product, Record, Nutrition等)
│   └── httputil/                       #   JSON レスポンスヘルパー (writeJSON, writeError)
│
├── services/                           # 各サービスのドメインロジック
│   ├── products/
│   │   ├── handler.go                  #   外部 HTTP ハンドラ (SearchProducts, GetProduct)
│   │   ├── grpc_server.go              #   内部 gRPC サーバー実装
│   │   └── repository.go              #   PostgreSQL products テーブルアクセス
│   │
│   ├── records/
│   │   ├── handler.go                  #   外部 HTTP ハンドラ (ListRecords, CreateRecord, DeleteRecord)
│   │   ├── grpc_server.go              #   内部 gRPC サーバー実装
│   │   ├── repository.go              #   PostgreSQL records テーブルアクセス
│   │   └── product_client.go          #   products サービスへの gRPC クライアント
│   │
│   ├── nutrition/
│   │   ├── handler.go                  #   外部 HTTP ハンドラ (GetNutrition)
│   │   ├── grpc_server.go              #   内部 gRPC サーバー実装
│   │   ├── calculator.go              #   栄養計算ロジック
│   │   └── record_client.go           #   records サービスへの gRPC クライアント
│   │
│   └── recommendations/
│       ├── handler.go                  #   外部 HTTP ハンドラ (GetRecommendations)
│       ├── engine.go                   #   おすすめアルゴリズム
│       ├── nutrition_client.go        #   nutrition サービスへの gRPC クライアント
│       └── product_client.go          #   products サービスへの gRPC クライアント
│
├── cmd/                                # エントリポイント
│   ├── products/main.go
│   ├── records/main.go
│   ├── nutrition/main.go
│   └── recommendations/main.go
│
├── migrations/                         # DB マイグレーション
│   └── 001_init.sql
│
├── go.mod
├── go.sum
├── Dockerfile
└── buf.yaml                            # buf (protoc代替) 設定
```

### 旧構成からの移行マッピング

| 旧 (internal/) | 新 | 備考 |
|---|---|---|
| `internal/model/product.go` | `pkg/model/product.go` | パッケージ名変更のみ |
| `internal/model/record.go` | `pkg/model/record.go` | 同上 |
| `internal/model/nutrition.go` | `pkg/model/nutrition.go` | 同上 |
| `internal/handler/product.go` | `services/products/handler.go` | chi → net/http に書き換え |
| `internal/handler/record.go` | `services/records/handler.go` | chi → net/http に書き換え |
| `internal/handler/nutrition.go` | `services/nutrition/handler.go` | chi → net/http に書き換え |
| `internal/handler/recommend.go` | `services/recommendations/handler.go` | chi → net/http に書き換え |
| `internal/handler/router.go` | 削除 | 各 main.go に分散 |
| `internal/repository/postgres_product.go` | `services/products/repository.go` | ほぼ流用 |
| `internal/repository/postgres_record.go` | `services/records/repository.go` | ほぼ流用 |
| `internal/repository/product.go` (DynamoDB) | 削除 | PostgreSQL に統一 |
| `internal/repository/record.go` (DynamoDB) | 削除 | PostgreSQL に統一 |
| `internal/repository/interfaces.go` | 削除 | 各サービス内で定義 |
| `internal/service/nutrition_calculator.go` | `services/nutrition/calculator.go` | gRPC クライアント経由に変更 |
| `internal/service/recommendation_engine.go` | `services/recommendations/engine.go` | gRPC クライアント経由に変更 |
| `internal/middleware/auth.go` | `pkg/middleware/auth.go` | 必要に応じて復活 |

---

## ポート割り当て

| サービス | ローカルHTTP | ローカルgRPC | 由来 | K8s |
|---|---|---|---|---|
| products | `:7111` | `:7112` | セブン-イレブン | `:8080` / `:9090` |
| records | `:8810` | `:8811` | ファミリーマート | `:8080` / `:9090` |
| nutrition | `:1056` | `:1057` | ローソン | `:8080` / `:9090` |
| recommendations | `:2525` | `:2526` | ニコニコ | `:8080` / `:9090` |

環境変数:
- `HTTP_PORT` - HTTP サーバーポート (デフォルト: サービス固有)
- `GRPC_PORT` - gRPC サーバーポート (デフォルト: HTTP+1)
- `DATABASE_URL` - PostgreSQL 接続文字列
- `PRODUCTS_GRPC_ADDR` - products サービスの gRPC アドレス (例: `localhost:7112`)
- `RECORDS_GRPC_ADDR` - records サービスの gRPC アドレス (例: `localhost:8811`)
- `NUTRITION_GRPC_ADDR` - nutrition サービスの gRPC アドレス (例: `localhost:1057`)

---

## Proto 定義

### product.proto

```protobuf
syntax = "proto3";
package product;
option go_package = "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product";

message Nutrition {
  double calories = 1;
  double protein  = 2;
  double fat      = 3;
  double carbs    = 4;
  double fiber    = 5;
  double salt     = 6;
}

message Product {
  string    product_id  = 1;
  string    name        = 2;
  string    brand       = 3;
  string    category    = 4;
  int32     price       = 5;
  Nutrition nutrition   = 6;
  string    image_url   = 7;
  string    description = 8;
}

message GetProductRequest {
  string product_id = 1;
}

message SearchProductsRequest {
  string query    = 1;
  string brand    = 2;
  string category = 3;
  int32  limit    = 4;
}

message SearchProductsResponse {
  repeated Product products = 1;
}

service ProductService {
  rpc GetProduct(GetProductRequest) returns (Product);
  rpc SearchProducts(SearchProductsRequest) returns (SearchProductsResponse);
}
```

### record.proto

```protobuf
syntax = "proto3";
package record;
option go_package = "github.com/TadokoroYuki/konbini-navi/apps/api/gen/record";

import "product/product.proto";

message Record {
  string          record_id  = 1;
  string          user_id    = 2;
  string          product_id = 3;
  product.Product product    = 4;
  string          date       = 5;
  string          meal_type  = 6;
  string          created_at = 7;
}

message ListRecordsRequest {
  string user_id = 1;
  string date    = 2;
}

message ListRecordsResponse {
  repeated Record records = 1;
}

message CreateRecordRequest {
  string user_id    = 1;
  string product_id = 2;
  string date       = 3;
  string meal_type  = 4;
}

message DeleteRecordRequest {
  string user_id   = 1;
  string record_id = 2;
}

message Empty {}

service RecordService {
  rpc ListRecords(ListRecordsRequest) returns (ListRecordsResponse);
  rpc CreateRecord(CreateRecordRequest) returns (Record);
  rpc DeleteRecord(DeleteRecordRequest) returns (Empty);
}
```

### nutrition.proto

```protobuf
syntax = "proto3";
package nutrition;
option go_package = "github.com/TadokoroYuki/konbini-navi/apps/api/gen/nutrition";

message NutrientStatus {
  double actual = 1;
  double target = 2;
  double ratio  = 3;
  string status = 4; // "deficient" | "adequate" | "excessive"
}

message NutritionSummary {
  string         date     = 1;
  NutrientStatus calories = 2;
  NutrientStatus protein  = 3;
  NutrientStatus fat      = 4;
  NutrientStatus carbs    = 5;
}

message GetNutritionRequest {
  string user_id = 1;
  string date    = 2;
}

service NutritionService {
  rpc GetNutrition(GetNutritionRequest) returns (NutritionSummary);
}
```

---

## 各サービスの実装詳細

### 1. products サービス

**責務**: 商品データの CRUD（現状は Read のみ）

**外部 HTTP API**:
- `GET /v1/products?q=&brand=&category=&limit=` → 商品検索
- `GET /v1/products/{productId}` → 商品詳細

**内部 gRPC API**:
- `SearchProducts(query, brand, category, limit)` → 商品検索
- `GetProduct(productId)` → 商品取得

**DB**: `products` テーブル直接アクセス

**cmd/products/main.go の処理フロー**:
```
1. DATABASE_URL から PostgreSQL に接続
2. repository を初期化
3. HTTP ハンドラを登録 (http.ServeMux)
4. gRPC サーバーを起動 (goroutine)
5. HTTP サーバーを起動
```

**net/http ルーティング (Go 1.22)**:
```go
mux := http.NewServeMux()
mux.HandleFunc("GET /v1/products", handler.Search)
mux.HandleFunc("GET /v1/products/{productId}", handler.Get)
```

**パスパラメータ取得 (chi → net/http)**:
```go
// 旧: chi.URLParam(r, "productId")
// 新: r.PathValue("productId")
```

---

### 2. records サービス

**責務**: 食事記録の CRUD

**外部 HTTP API**:
- `GET /v1/users/{userId}/records?date=` → 記録一覧
- `POST /v1/users/{userId}/records` → 記録作成
- `DELETE /v1/users/{userId}/records/{recordId}` → 記録削除

**内部 gRPC API**:
- `ListRecords(userId, date)` → 記録一覧（商品情報付き）
- `CreateRecord(userId, productId, date, mealType)` → 記録作成
- `DeleteRecord(userId, recordId)` → 記録削除

**DB**: `records` テーブル直接アクセス

**gRPC クライアント**: products サービスに接続して商品情報を取得

**cmd/records/main.go の処理フロー**:
```
1. DATABASE_URL から PostgreSQL に接続
2. PRODUCTS_GRPC_ADDR から products gRPC クライアントを初期化
3. repository を初期化
4. HTTP ハンドラ / gRPC サーバーを起動
```

---

### 3. nutrition サービス

**責務**: 1日の栄養バランスを計算

**外部 HTTP API**:
- `GET /v1/users/{userId}/nutrition?date=` → 栄養バランス

**内部 gRPC API**:
- `GetNutrition(userId, date)` → 栄養サマリー

**DB**: なし

**gRPC クライアント**: records サービスに接続（ListRecords で商品情報込みの記録を取得）

**計算ロジック** (既存の calculator.go を移植):
- records から取得した商品の栄養素を合算
- 目標値 (2000kcal / 65g protein / 55g fat / 300g carbs) と比較
- ratio < 0.7 → deficient / 0.7-1.2 → adequate / > 1.2 → excessive

---

### 4. recommendations サービス

**責務**: 不足栄養素に基づくおすすめ商品

**外部 HTTP API**:
- `GET /v1/users/{userId}/recommendations?date=` → おすすめ商品

**内部 gRPC API**: なし（他サービスから呼ばれない）

**DB**: なし

**gRPC クライアント**:
- nutrition サービス → GetNutrition で不足栄養素を特定
- products サービス → SearchProducts で商品候補を取得

**アルゴリズム** (既存の engine.go を移植):
- nutrition から deficient な栄養素を取得
- products から全商品を取得してスコアリング
- 上位5件を返却

---

## 実装順序

### Phase 1: 基盤整備
1. ディレクトリ構成を作成
2. `pkg/model/` にモデルを移動
3. `pkg/httputil/` にヘルパーを作成
4. `buf.yaml` を設定し proto ファイルを作成
5. `buf generate` で gRPC コードを自動生成
6. `go.mod` に gRPC 依存を追加、chi 依存を削除

### Phase 2: products サービス（独立・依存なし）
1. `services/products/repository.go` - PostgreSQL アクセス
2. `services/products/handler.go` - HTTP ハンドラ (net/http)
3. `services/products/grpc_server.go` - gRPC サーバー
4. `cmd/products/main.go` - エントリポイント
5. 動作確認: curl で HTTP API テスト

### Phase 3: records サービス（products に依存）
1. `services/records/product_client.go` - products gRPC クライアント
2. `services/records/repository.go` - PostgreSQL アクセス
3. `services/records/handler.go` - HTTP ハンドラ
4. `services/records/grpc_server.go` - gRPC サーバー
5. `cmd/records/main.go` - エントリポイント
6. 動作確認: products を起動した状態で records をテスト

### Phase 4: nutrition サービス（records に依存）
1. `services/nutrition/record_client.go` - records gRPC クライアント
2. `services/nutrition/calculator.go` - 栄養計算ロジック
3. `services/nutrition/handler.go` - HTTP ハンドラ
4. `services/nutrition/grpc_server.go` - gRPC サーバー
5. `cmd/nutrition/main.go` - エントリポイント

### Phase 5: recommendations サービス（nutrition + products に依存）
1. `services/recommendations/nutrition_client.go` - nutrition gRPC クライアント
2. `services/recommendations/product_client.go` - products gRPC クライアント
3. `services/recommendations/engine.go` - おすすめアルゴリズム
4. `services/recommendations/handler.go` - HTTP ハンドラ
5. `cmd/recommendations/main.go` - エントリポイント

### Phase 6: 仕上げ
1. 旧 `internal/` ディレクトリを削除
2. Dockerfile を各サービス用に調整（マルチステージビルド）
3. docker-compose.yml でローカル一括起動
4. 全 API の結合テスト

---

## 技術スタック変更

### 追加
- `google.golang.org/grpc` - gRPC フレームワーク
- `google.golang.org/protobuf` - Protocol Buffers
- `buf` (CLI) - proto コンパイル・リント

### 削除
- `github.com/go-chi/chi/v5` - net/http に置換
- `github.com/go-chi/cors` - 自前 CORS ミドルウェアに置換
- `github.com/aws/aws-sdk-go-v2` 関連 - DynamoDB 不使用
- `github.com/aws/aws-lambda-go` - Lambda 不使用

### 維持
- `github.com/lib/pq` - PostgreSQL ドライバ
- `github.com/oklog/ulid/v2` - ID 生成

---

## CORS ミドルウェア（chi 置換）

chi/cors を使わず、net/http ミドルウェアとして自前実装する:

```go
// pkg/middleware/cors.go
func CORS(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-Device-Id")
        w.Header().Set("Access-Control-Max-Age", "300")
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

---

## cmd/products/main.go のイメージ

```go
package main

import (
    "database/sql"
    "log"
    "net"
    "net/http"
    "os"

    _ "github.com/lib/pq"
    "google.golang.org/grpc"

    "github.com/TadokoroYuki/konbini-navi/apps/api/services/products"
    productpb "github.com/TadokoroYuki/konbini-navi/apps/api/gen/product"
)

func main() {
    httpPort := getEnv("HTTP_PORT", "7111")
    grpcPort := getEnv("GRPC_PORT", "7112")
    dbURL := os.Getenv("DATABASE_URL")

    // DB 接続
    db, err := sql.Open("postgres", dbURL)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    repo := products.NewRepository(db)
    handler := products.NewHandler(repo)
    grpcServer := products.NewGRPCServer(repo)

    // gRPC サーバー起動
    go func() {
        lis, _ := net.Listen("tcp", ":"+grpcPort)
        s := grpc.NewServer()
        productpb.RegisterProductServiceServer(s, grpcServer)
        log.Printf("products gRPC server on :%s", grpcPort)
        s.Serve(lis)
    }()

    // HTTP サーバー起動
    mux := http.NewServeMux()
    mux.HandleFunc("GET /v1/products", handler.Search)
    mux.HandleFunc("GET /v1/products/{productId}", handler.Get)
    mux.HandleFunc("GET /health", handler.Health)

    log.Printf("products HTTP server on :%s", httpPort)
    log.Fatal(http.ListenAndServe(":"+httpPort, mux))
}

func getEnv(key, fallback string) string {
    if v := os.Getenv(key); v != "" {
        return v
    }
    return fallback
}
```
