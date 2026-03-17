# 開発ガイド

## ブランチ戦略

```
main (本番)
 └── feature/xxx  (機能ブランチ)
```

- `main` ブランチから `feature/xxx` ブランチを切る
- 実装完了後、PRを作成して `main` にマージ
- ブランチ名例: `feature/product-search`, `fix/nutrition-calculation`

## 開発フロー

1. **Issue確認**: GitHub Issueで実装内容を確認
2. **ブランチ作成**: `git checkout -b feature/xxx`
3. **実装**: コードを書く
4. **テスト**: ローカルで動作確認
5. **PR作成**: GitHub PRを作成、レビュー依頼
6. **マージ**: レビュー後 `main` にマージ

## コーディング規約

### TypeScript (Mobile / Infra)
- `strict: true`
- 関数コンポーネント + hooks を使用
- 型は `api-schema` パッケージから import

### Go (API)
- `gofmt` でフォーマット
- エラーは必ずハンドリング（`_` で無視しない）
- Clean Architecture: handler → service → repository

### コミットメッセージ

```
[タグ] 変更内容の要約

タグ: feat, fix, docs, refactor, test, chore, infra
例: [feat] 商品検索APIの実装
```

## ディレクトリ構成のルール

- 新しい画面は `apps/mobile/app/` に追加
- 共有コンポーネントは `apps/mobile/components/`
- APIハンドラーは `apps/api/internal/handler/`
- ビジネスロジックは `apps/api/internal/service/`
- DB操作は `apps/api/internal/repository/`

## 型の共有

1. `packages/api-schema/openapi.yaml` を編集
2. `pnpm generate:types` で型を再生成
3. フロントエンドで `import type { ... } from 'api-schema/generated/types'`
