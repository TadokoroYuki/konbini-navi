# ArgoCD Setup

このディレクトリには ArgoCD と ArgoCD Image Updater の設定ファイルが含まれています。

## ⚠️ 重要

これらのファイルは **ArgoCD の監視対象外** です（`infra/k8s/` のみ監視）。
変更した場合は **手動で kubectl apply** する必要があります。

## セットアップ手順

### 1. ArgoCD Image Updater のインストール

```bash
kubectl apply -f argocd-image-updater.yaml
```

### 2. ECR トークン自動更新 CronJob のインストール

```bash
kubectl apply -f ecr-cronjob.yaml
```

### 3. 初回 ECR Secret の作成

```bash
# CronJob から手動実行
kubectl create job --from=cronjob/ecr-token-refresh ecr-token-init -n argocd

# または、ローカルから直接作成
TOKEN=$(aws ecr get-login-password --region ap-northeast-1)
kubectl create secret generic ecr-cred-secret \
  --from-literal=creds=AWS:$TOKEN \
  --namespace=argocd \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 4. ArgoCD Application の適用（オプション）

```bash
kubectl apply -f argocd-application.yaml
```

## アーキテクチャ

```
GitHub main branch push
    ↓
CodePipeline triggered
    ↓
CodeBuild: Docker build → ECR push (latest + commit-hash tags)
    ↓
ArgoCD Image Updater: Monitors ECR every 2 minutes
    ↓ (New image detected)
ArgoCD: Auto-sync K8s manifests from infra/k8s/
    ↓
Kubernetes: Rolling update with new images
```

## トラブルシューティング

### Image Updater が ECR にアクセスできない

```bash
# Secret の確認
kubectl get secret ecr-cred-secret -n argocd

# Image Updater のログ確認
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater --tail=50

# CronJob の実行履歴
kubectl get jobs -n argocd
```

### ECR トークンの手動更新

```bash
TOKEN=$(aws ecr get-login-password --region ap-northeast-1)
kubectl create secret generic ecr-cred-secret \
  --from-literal=creds=AWS:$TOKEN \
  --namespace=argocd \
  --dry-run=client -o yaml | kubectl apply -f -

# Image Updater を再起動
kubectl rollout restart deployment argocd-image-updater -n argocd
```
