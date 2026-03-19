# API仕様書

OpenAPI仕様: [`packages/api-schema/openapi.yaml`](../packages/api-schema/openapi.yaml)

## エンドポイント一覧

### 商品

#### `GET /products` - 商品検索

```bash
# キーワード検索
curl "https://api.example.com/v1/products?q=おにぎり"

# ブランド+カテゴリ絞り込み
curl "https://api.example.com/v1/products?brand=seven_eleven&category=onigiri"
```

**レスポンス例:**
```json
{
  "products": [
    {
      "productId": "prod_001",
      "name": "手巻おにぎり 鮭",
      "brand": "seven_eleven",
      "category": "onigiri",
      "price": 160,
      "nutrition": {
        "calories": 183,
        "protein": 5.2,
        "fat": 1.8,
        "carbs": 37.5
      },
      "imageUrl": "https://..."
    }
  ]
}
```

#### `GET /products/{productId}` - 商品詳細

```bash
curl "https://api.example.com/v1/products/prod_001"
```

### 食事記録

#### `GET /users/{userId}/records?date=` - 食事記録一覧

```bash
curl "https://api.example.com/v1/users/device_abc123/records?date=2026-03-17"
```

**レスポンス例:**
```json
{
  "records": [
    {
      "recordId": "rec_01JQXYZ...",
      "userId": "device_abc123",
      "productId": "prod_001",
      "product": { "name": "手巻おにぎり 鮭", "..." : "..." },
      "date": "2026-03-17",
      "mealType": "lunch",
      "createdAt": "2026-03-17T12:30:00Z"
    }
  ]
}
```

#### `POST /users/{userId}/records` - 食事記録作成

```bash
curl -X POST "https://api.example.com/v1/users/device_abc123/records" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_001",
    "date": "2026-03-17",
    "mealType": "lunch"
  }'
```

#### `DELETE /users/{userId}/records/{recordId}` - 食事記録削除

```bash
curl -X DELETE "https://api.example.com/v1/users/device_abc123/records/rec_01JQXYZ..."
```

### 栄養バランス

#### `GET /users/{userId}/nutrition?date=` - 栄養バランス取得

```bash
curl "https://api.example.com/v1/users/device_abc123/nutrition?date=2026-03-17"
```

**レスポンス例:**
```json
{
  "date": "2026-03-17",
  "calories": { "actual": 850, "target": 2000, "ratio": 0.425, "status": "deficient" },
  "protein": { "actual": 30, "target": 65, "ratio": 0.461, "status": "deficient" },
  "fat": { "actual": 25, "target": 55, "ratio": 0.454, "status": "deficient" },
  "carbs": { "actual": 120, "target": 300, "ratio": 0.4, "status": "deficient" }
}
```

### おすすめ

#### `GET /users/{userId}/recommendations?date=` - おすすめ商品取得

```bash
curl "https://api.example.com/v1/users/device_abc123/recommendations?date=2026-03-17"
```

**レスポンス例:**
```json
{
  "recommendations": [
    {
      "product": { "name": "サラダチキン", "..." : "..." },
      "reason": "タンパク質が不足しています。サラダチキンで効率的に補えます。",
      "deficientNutrients": ["protein"]
    }
  ]
}
```

## ステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功 |
| 400 | バリデーションエラー |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |
