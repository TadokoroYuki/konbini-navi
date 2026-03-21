# 本番環境 動作確認手順

## 本番環境の概要

| リソース | 名前 | リージョン |
|---|---|---|
| EKS | `konbini-navi-cluster` (k8s 1.31) | ap-northeast-1 |
| ノード | t3.medium x2 | ap-northeast-1 |
| ALB | `k8s-default-konbinin-d154cd8c14` | ap-northeast-1 |
| ECR | `konbini-navi-api` | ap-northeast-1 |
| CI/CD | CodePipeline `konbini-navi-pipeline` | ap-northeast-1 |

**ALB エンドポイント**:
```
http://k8s-default-konbinin-d154cd8c14-537123251.ap-northeast-1.elb.amazonaws.com
```

## 前提

```bash
# AWS認証情報をセット（セッション有効期限に注意）
export AWS_DEFAULT_REGION="ap-northeast-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."
```

## Step 1: インフラ状態の確認

```bash
# EKSクラスタ
aws eks describe-cluster --name konbini-navi-cluster \
  --query 'cluster.[name,status,version]' --output table

# ノード状態
aws eks describe-nodegroup --cluster-name konbini-navi-cluster \
  --nodegroup-name konbini-navi-nodes \
  --query 'nodegroup.[status,scalingConfig]' --output json

# ALB（ロードバランサー）
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' --output table
```

**期待値**: EKS=ACTIVE, ノード=ACTIVE, ALB=active

## Step 2: API エンドポイントの動作確認

```bash
ALB="http://k8s-default-konbinin-d154cd8c14-537123251.ap-northeast-1.elb.amazonaws.com"
```

### 商品API

```bash
# 商品一覧（60件返ればOK）
curl -s "$ALB/v1/products" | jq '.products | length'

# 商品検索
curl -s "$ALB/v1/products?q=%E3%81%8A%E3%81%AB%E3%81%8E%E3%82%8A" | jq '.products[0].name'
# → "手巻おにぎり 鮭" 等
```

### 食事記録API

```bash
# 記録作成
curl -s -X POST "$ALB/v1/users/test-device/records" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_001","date":"2026-03-21","mealType":"lunch"}' | jq .

# 記録一覧
curl -s "$ALB/v1/users/test-device/records?date=2026-03-21" | jq '.records'

# 記録削除（recordIdは上の一覧で確認）
curl -s -X DELETE "$ALB/v1/users/test-device/records/{recordId}"
```

### 栄養バランスAPI

```bash
curl -s "$ALB/v1/users/test-device/nutrition?date=2026-03-21" | jq .
# → calories/protein/fat/carbs の status が返る
```

### おすすめAPI

```bash
curl -s "$ALB/v1/users/test-device/recommendations?date=2026-03-21" | jq '.recommendations | length'
# → 1以上
```

## Step 3: モバイルアプリから本番接続

```bash
cd apps/mobile
API_URL="http://k8s-default-konbinin-d154cd8c14-537123251.ap-northeast-1.elb.amazonaws.com/v1" \
  npx expo start
```

Expo Go アプリでQRコードをスキャンし、以下を確認:
- [ ] ホーム画面で栄養バランスが表示される
- [ ] 商品検索で結果が返る
- [ ] 食事記録の作成・削除ができる
- [ ] おすすめ商品が表示される

## Step 4: CI/CD パイプラインの確認

```bash
# パイプライン状態
aws codepipeline get-pipeline-state --name konbini-navi-pipeline \
  --query 'stageStates[*].[stageName,actionStates[0].latestExecution.status]' --output table
# → Source=Succeeded, Build=Succeeded

# 最新ECRイメージ
aws ecr describe-images --repository-name konbini-navi-api \
  --query 'sort_by(imageDetails, &imagePushedAt)[-1].[imageTags[0],imagePushedAt]' --output table
```

## チェックリスト

- [ ] EKSクラスタ ACTIVE
- [ ] ノード Running (2台)
- [ ] ALB active
- [ ] `GET /v1/products` → 200 (60件)
- [ ] `POST /v1/users/{id}/records` → 201
- [ ] `GET /v1/users/{id}/nutrition` → 200
- [ ] `GET /v1/users/{id}/recommendations` → 200
- [ ] CodePipeline Source/Build Succeeded
- [ ] Expoアプリから本番API接続OK
