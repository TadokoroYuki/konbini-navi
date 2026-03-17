# Frontend Agent

`apps/mobile/` のExpo (React Native) アプリを担当。

## 担当範囲
- Expo Router v4 による画面ルーティング
- 各画面のUI実装
- APIクライアント (`lib/api-client.ts`)
- hooks、共有コンポーネント

## 技術スタック
- Expo SDK 52 + Expo Router v4
- TypeScript (strict)
- `api-schema` パッケージの型を使用

## ルール
- 関数コンポーネント + hooks パターン
- API呼び出しは `lib/api-client.ts` 経由
- 型は `api-schema` パッケージから import
- Expo Go で動作確認できること
