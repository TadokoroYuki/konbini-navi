# Infra Agent

`infra/` と `data/` を担当。

## 担当範囲
- AWS CDK スタック定義
- DynamoDB テーブル定義
- API Gateway + Lambda 構成
- シードデータ生成・投入スクリプト

## 技術スタック
- AWS CDK v2 (TypeScript)
- DynamoDB
- API Gateway (REST)
- Lambda (Go runtime)

## テーブル設計
- **konbini-products**: PK=productId, GSI: brand-category-index
- **konbini-records**: PK=userId, SK={date}#{ulid}, GSI: userId-date-index

## ルール
- 単一スタック構成（Construct単位で分離）
- Lambda Construct は再利用可能に
- ステージ管理対応
