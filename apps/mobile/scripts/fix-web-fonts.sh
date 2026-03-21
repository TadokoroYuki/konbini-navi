#!/bin/bash
# Expo Web ビルド後にアイコンフォントを修正するスクリプト
# Usage: ./scripts/fix-web-fonts.sh [dist-dir]
#
# 問題: expo export --platform web が生成するフォントパスが
# /assets/__node_modules/.pnpm/@expo+vector-icons@.../Ionicons.xxx.ttf
# のように超長く、Amplifyなどのホスティングで配信できない
#
# 解決: フォントを /assets/fonts/ にコピーし、JSバンドル内の参照を書き換える

set -euo pipefail

DIST_DIR="${1:-dist}"

if [ ! -d "$DIST_DIR" ]; then
  echo "Error: $DIST_DIR not found"
  exit 1
fi

echo "Fixing web fonts in $DIST_DIR..."

# 1. フォントファイルを短いパスにコピー
mkdir -p "$DIST_DIR/assets/fonts"
find "$DIST_DIR/assets" -name "*.ttf" | while read -r ttf; do
  filename=$(basename "$ttf")
  cp "$ttf" "$DIST_DIR/assets/fonts/$filename"
  echo "  Copied: $filename"
done

# 2. JSバンドル内のフォントパス参照を書き換え
for js in "$DIST_DIR"/_expo/static/js/web/*.js; do
  [ -f "$js" ] || continue
  # 長いnode_modulesパスを /assets/fonts/ に置換
  sed -i.bak 's|/assets/__node_modules/[^"]*Fonts/\([^"]*\.ttf\)|/assets/fonts/\1|g' "$js"
  rm -f "$js.bak"
  echo "  Patched: $(basename "$js")"
done

# 3. 元の深いディレクトリを削除（オプション）
rm -rf "$DIST_DIR/assets/__node_modules"
echo "  Cleaned up __node_modules"

echo "Done! Fonts are now served from /assets/fonts/"
