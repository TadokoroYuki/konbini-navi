#!/bin/bash
# Local development setup script for konbini-navi
# Starts DynamoDB Local, creates tables, and seeds product data.
#
# Prerequisites: Docker running
# Usage: ./scripts/local-setup.sh

set -euo pipefail

CONTAINER_NAME="konbini-dynamodb-local"
ENDPOINT="http://localhost:8000"

# Use dummy credentials for DynamoDB Local
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy
export AWS_DEFAULT_REGION=ap-northeast-1

echo "=== Konbini Navi Local Setup ==="

# 1. Start DynamoDB Local
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "DynamoDB Local is already running."
else
  echo "Starting DynamoDB Local..."
  docker run -d --name "$CONTAINER_NAME" -p 8000:8000 \
    amazon/dynamodb-local:latest \
    -jar DynamoDBLocal.jar -sharedDb 2>/dev/null || \
  docker start "$CONTAINER_NAME"
  sleep 2
fi

# 2. Create tables
echo "Creating tables..."

# Products table
aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --table-name konbini-products \
  --attribute-definitions AttributeName=productId,AttributeType=S \
  --key-schema AttributeName=productId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "  konbini-products table already exists"

# Records table
aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --table-name konbini-records \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "  konbini-records table already exists"

echo "Tables created."

# 3. Seed product data
echo "Seeding product data..."

PRODUCTS='[
  {"productId":"p001","name":"サラダチキン（プレーン）","brand":"セブンイレブン","category":"おかず","price":213,"imageUrl":"","nutrition":{"calories":105,"protein":23.8,"fat":0.9,"carbs":0.3,"fiber":0,"salt":1.2}},
  {"productId":"p002","name":"たんぱく質が摂れるチキン&スパイシーチリ","brand":"セブンイレブン","category":"サンドイッチ","price":397,"imageUrl":"","nutrition":{"calories":325,"protein":22.5,"fat":12.3,"carbs":32.1,"fiber":1.8,"salt":2.5}},
  {"productId":"p003","name":"味付き半熟ゆでたまご","brand":"セブンイレブン","category":"おかず","price":95,"imageUrl":"","nutrition":{"calories":66,"protein":5.8,"fat":4.5,"carbs":0.6,"fiber":0,"salt":0.5}},
  {"productId":"p004","name":"おにぎり 鮭","brand":"セブンイレブン","category":"おにぎり","price":160,"imageUrl":"","nutrition":{"calories":182,"protein":5.2,"fat":1.8,"carbs":37.5,"fiber":0.5,"salt":1.1}},
  {"productId":"p005","name":"おにぎり ツナマヨネーズ","brand":"セブンイレブン","category":"おにぎり","price":140,"imageUrl":"","nutrition":{"calories":232,"protein":5.5,"fat":7.2,"carbs":37.8,"fiber":0.5,"salt":1.3}},
  {"productId":"p006","name":"幕の内弁当","brand":"セブンイレブン","category":"弁当","price":598,"imageUrl":"","nutrition":{"calories":682,"protein":22.5,"fat":18.3,"carbs":105.2,"fiber":3.2,"salt":3.8}},
  {"productId":"p007","name":"野菜たっぷり！ミネストローネ","brand":"セブンイレブン","category":"スープ","price":321,"imageUrl":"","nutrition":{"calories":145,"protein":5.2,"fat":3.8,"carbs":22.5,"fiber":4.2,"salt":2.1}},
  {"productId":"p008","name":"1/2日分の野菜サラダ","brand":"セブンイレブン","category":"サラダ","price":354,"imageUrl":"","nutrition":{"calories":85,"protein":3.2,"fat":1.5,"carbs":15.8,"fiber":5.5,"salt":0.8}},
  {"productId":"p009","name":"バナナ","brand":"セブンイレブン","category":"フルーツ","price":129,"imageUrl":"","nutrition":{"calories":93,"protein":1.1,"fat":0.2,"carbs":22.5,"fiber":1.1,"salt":0}},
  {"productId":"p010","name":"プロテインバー チョコレート","brand":"セブンイレブン","category":"お菓子","price":181,"imageUrl":"","nutrition":{"calories":183,"protein":15.9,"fat":8.5,"carbs":12.8,"fiber":6.2,"salt":0.4}},
  {"productId":"p011","name":"サラダチキンバー スモークペッパー","brand":"ファミリーマート","category":"おかず","price":198,"imageUrl":"","nutrition":{"calories":83,"protein":15.2,"fat":2.1,"carbs":0.8,"fiber":0,"salt":1.1}},
  {"productId":"p012","name":"ファミチキ","brand":"ファミリーマート","category":"ホットスナック","price":198,"imageUrl":"","nutrition":{"calories":251,"protein":12.8,"fat":15.7,"carbs":14.8,"fiber":0.5,"salt":1.8}},
  {"productId":"p013","name":"直巻 明太子マヨネーズ","brand":"ファミリーマート","category":"おにぎり","price":158,"imageUrl":"","nutrition":{"calories":218,"protein":4.8,"fat":5.5,"carbs":38.2,"fiber":0.3,"salt":1.5}},
  {"productId":"p014","name":"チーズインハンバーグ弁当","brand":"ファミリーマート","category":"弁当","price":548,"imageUrl":"","nutrition":{"calories":758,"protein":25.2,"fat":28.5,"carbs":98.3,"fiber":2.1,"salt":3.5}},
  {"productId":"p015","name":"グリーンスムージー","brand":"ファミリーマート","category":"飲料","price":198,"imageUrl":"","nutrition":{"calories":78,"protein":1.2,"fat":0,"carbs":18.5,"fiber":2.8,"salt":0.1}},
  {"productId":"p016","name":"ざるそば","brand":"ファミリーマート","category":"麺類","price":430,"imageUrl":"","nutrition":{"calories":342,"protein":12.5,"fat":2.8,"carbs":68.2,"fiber":3.5,"salt":3.2}},
  {"productId":"p017","name":"たまごサンド","brand":"ファミリーマート","category":"サンドイッチ","price":268,"imageUrl":"","nutrition":{"calories":312,"protein":10.5,"fat":15.8,"carbs":32.5,"fiber":1.2,"salt":1.8}},
  {"productId":"p018","name":"枝豆","brand":"ファミリーマート","category":"おかず","price":138,"imageUrl":"","nutrition":{"calories":134,"protein":11.5,"fat":6.2,"carbs":8.8,"fiber":4.6,"salt":0.8}},
  {"productId":"p019","name":"RIZAPサラダチキンバー","brand":"ファミリーマート","category":"おかず","price":172,"imageUrl":"","nutrition":{"calories":69,"protein":11.2,"fat":1.8,"carbs":2.5,"fiber":0,"salt":0.9}},
  {"productId":"p020","name":"ビタミン野菜ジュース","brand":"ファミリーマート","category":"飲料","price":108,"imageUrl":"","nutrition":{"calories":68,"protein":0.8,"fat":0,"carbs":16.2,"fiber":1.5,"salt":0.2}},
  {"productId":"p021","name":"からあげクン レギュラー","brand":"ローソン","category":"ホットスナック","price":238,"imageUrl":"","nutrition":{"calories":220,"protein":14.0,"fat":14.0,"carbs":8.0,"fiber":0.3,"salt":1.5}},
  {"productId":"p022","name":"おにぎり 紅鮭","brand":"ローソン","category":"おにぎり","price":168,"imageUrl":"","nutrition":{"calories":178,"protein":5.5,"fat":2.2,"carbs":35.8,"fiber":0.5,"salt":1.2}},
  {"productId":"p023","name":"ブランパン 2個入","brand":"ローソン","category":"パン","price":150,"imageUrl":"","nutrition":{"calories":130,"protein":10.4,"fat":4.4,"carbs":11.6,"fiber":11.2,"salt":0.6}},
  {"productId":"p024","name":"タンスティック プレーン","brand":"ローソン","category":"おかず","price":158,"imageUrl":"","nutrition":{"calories":68,"protein":13.8,"fat":1.2,"carbs":0.5,"fiber":0,"salt":0.8}},
  {"productId":"p025","name":"1食分の野菜が摂れるスープ","brand":"ローソン","category":"スープ","price":399,"imageUrl":"","nutrition":{"calories":168,"protein":8.5,"fat":5.2,"carbs":22.8,"fiber":5.8,"salt":2.5}},
  {"productId":"p026","name":"パリパリ食感のサラダ","brand":"ローソン","category":"サラダ","price":321,"imageUrl":"","nutrition":{"calories":72,"protein":2.8,"fat":1.2,"carbs":12.5,"fiber":4.8,"salt":0.6}},
  {"productId":"p027","name":"チキン南蛮弁当","brand":"ローソン","category":"弁当","price":598,"imageUrl":"","nutrition":{"calories":725,"protein":28.5,"fat":25.8,"carbs":95.2,"fiber":2.5,"salt":4.2}},
  {"productId":"p028","name":"冷やし中華","brand":"ローソン","category":"麺類","price":498,"imageUrl":"","nutrition":{"calories":412,"protein":15.8,"fat":8.5,"carbs":68.5,"fiber":2.8,"salt":3.8}},
  {"productId":"p029","name":"納豆巻","brand":"ローソン","category":"おにぎり","price":128,"imageUrl":"","nutrition":{"calories":182,"protein":6.5,"fat":2.5,"carbs":34.2,"fiber":2.2,"salt":0.8}},
  {"productId":"p030","name":"プロテイン入りヨーグルト","brand":"ローソン","category":"デザート","price":178,"imageUrl":"","nutrition":{"calories":95,"protein":12.5,"fat":0.8,"carbs":10.2,"fiber":0,"salt":0.2}},
  {"productId":"p031","name":"鶏むね肉の照り焼き","brand":"セブンイレブン","category":"おかず","price":298,"imageUrl":"","nutrition":{"calories":185,"protein":22.5,"fat":6.8,"carbs":8.5,"fiber":0.2,"salt":1.8}},
  {"productId":"p032","name":"7プレミアム 豆腐","brand":"セブンイレブン","category":"おかず","price":95,"imageUrl":"","nutrition":{"calories":56,"protein":5.0,"fat":3.0,"carbs":2.0,"fiber":0.3,"salt":0}},
  {"productId":"p033","name":"もち麦おにぎり 枝豆と塩昆布","brand":"セブンイレブン","category":"おにぎり","price":138,"imageUrl":"","nutrition":{"calories":172,"protein":4.8,"fat":1.5,"carbs":35.2,"fiber":2.8,"salt":1.0}},
  {"productId":"p034","name":"カップヌードル","brand":"セブンイレブン","category":"麺類","price":214,"imageUrl":"","nutrition":{"calories":351,"protein":10.5,"fat":15.0,"carbs":44.5,"fiber":2.0,"salt":4.9}},
  {"productId":"p035","name":"ほうれん草のおひたし","brand":"セブンイレブン","category":"おかず","price":192,"imageUrl":"","nutrition":{"calories":25,"protein":2.8,"fat":0.5,"carbs":2.5,"fiber":2.2,"salt":0.8}},
  {"productId":"p036","name":"ミックスナッツ","brand":"セブンイレブン","category":"お菓子","price":321,"imageUrl":"","nutrition":{"calories":420,"protein":12.5,"fat":38.0,"carbs":12.8,"fiber":5.5,"salt":0.3}},
  {"productId":"p037","name":"スーパー大麦バーリーマックス入おにぎり","brand":"ファミリーマート","category":"おにぎり","price":158,"imageUrl":"","nutrition":{"calories":188,"protein":4.5,"fat":2.2,"carbs":38.5,"fiber":3.5,"salt":0.9}},
  {"productId":"p038","name":"全粒粉サンド チキンとたまご","brand":"ファミリーマート","category":"サンドイッチ","price":348,"imageUrl":"","nutrition":{"calories":295,"protein":18.2,"fat":10.5,"carbs":32.8,"fiber":3.2,"salt":2.0}},
  {"productId":"p039","name":"焼き魚 鯖の塩焼き","brand":"ファミリーマート","category":"おかず","price":258,"imageUrl":"","nutrition":{"calories":215,"protein":18.5,"fat":15.2,"carbs":0.5,"fiber":0,"salt":1.2}},
  {"productId":"p040","name":"わかめスープ","brand":"ファミリーマート","category":"スープ","price":108,"imageUrl":"","nutrition":{"calories":18,"protein":1.2,"fat":0.8,"carbs":1.5,"fiber":1.0,"salt":1.8}},
  {"productId":"p041","name":"チョコレート効果 72%","brand":"ファミリーマート","category":"お菓子","price":238,"imageUrl":"","nutrition":{"calories":280,"protein":5.0,"fat":20.5,"carbs":20.2,"fiber":6.5,"salt":0}},
  {"productId":"p042","name":"具だくさん豚汁","brand":"ローソン","category":"スープ","price":350,"imageUrl":"","nutrition":{"calories":158,"protein":8.2,"fat":7.5,"carbs":14.8,"fiber":3.2,"salt":2.8}},
  {"productId":"p043","name":"大豆ミートのタコスミート","brand":"ローソン","category":"おかず","price":198,"imageUrl":"","nutrition":{"calories":112,"protein":12.5,"fat":3.8,"carbs":8.2,"fiber":3.5,"salt":1.5}},
  {"productId":"p044","name":"たんぱく質10gのサラダチキンロール","brand":"ローソン","category":"パン","price":198,"imageUrl":"","nutrition":{"calories":148,"protein":10.0,"fat":5.5,"carbs":15.2,"fiber":1.2,"salt":1.3}},
  {"productId":"p045","name":"玄米おにぎり 梅","brand":"ローソン","category":"おにぎり","price":135,"imageUrl":"","nutrition":{"calories":165,"protein":3.5,"fat":1.0,"carbs":35.8,"fiber":1.8,"salt":1.1}},
  {"productId":"p046","name":"オイコス ストロベリー","brand":"セブンイレブン","category":"デザート","price":178,"imageUrl":"","nutrition":{"calories":92,"protein":10.0,"fat":0,"carbs":12.5,"fiber":0,"salt":0.1}},
  {"productId":"p047","name":"サバ缶（水煮）","brand":"セブンイレブン","category":"おかず","price":198,"imageUrl":"","nutrition":{"calories":180,"protein":20.5,"fat":10.8,"carbs":0.2,"fiber":0,"salt":0.9}},
  {"productId":"p048","name":"もずく酢","brand":"ファミリーマート","category":"おかず","price":108,"imageUrl":"","nutrition":{"calories":12,"protein":0.3,"fat":0,"carbs":2.8,"fiber":1.5,"salt":1.2}},
  {"productId":"p049","name":"アーモンドミルク","brand":"ローソン","category":"飲料","price":148,"imageUrl":"","nutrition":{"calories":30,"protein":0.8,"fat":2.0,"carbs":2.2,"fiber":0.5,"salt":0.2}},
  {"productId":"p050","name":"プロテインドリンク ココア味","brand":"ローソン","category":"飲料","price":178,"imageUrl":"","nutrition":{"calories":102,"protein":15.0,"fat":0.8,"carbs":8.5,"fiber":0,"salt":0.3}},
  {"productId":"p051","name":"ささみ揚げ","brand":"セブンイレブン","category":"ホットスナック","price":148,"imageUrl":"","nutrition":{"calories":145,"protein":15.5,"fat":6.2,"carbs":6.8,"fiber":0.2,"salt":1.0}},
  {"productId":"p052","name":"鶏そぼろ弁当","brand":"セブンイレブン","category":"弁当","price":450,"imageUrl":"","nutrition":{"calories":585,"protein":20.5,"fat":12.8,"carbs":98.5,"fiber":1.5,"salt":3.0}},
  {"productId":"p053","name":"ネバネバサラダ","brand":"ファミリーマート","category":"サラダ","price":298,"imageUrl":"","nutrition":{"calories":68,"protein":4.5,"fat":0.8,"carbs":11.8,"fiber":4.2,"salt":1.0}},
  {"productId":"p054","name":"フルーツミックス","brand":"ローソン","category":"フルーツ","price":248,"imageUrl":"","nutrition":{"calories":82,"protein":0.8,"fat":0.2,"carbs":20.2,"fiber":1.5,"salt":0}},
  {"productId":"p055","name":"肉まん","brand":"ファミリーマート","category":"ホットスナック","price":168,"imageUrl":"","nutrition":{"calories":232,"protein":8.5,"fat":8.2,"carbs":32.5,"fiber":1.2,"salt":1.5}},
  {"productId":"p056","name":"たまご豆腐","brand":"セブンイレブン","category":"おかず","price":108,"imageUrl":"","nutrition":{"calories":48,"protein":3.5,"fat":2.8,"carbs":2.2,"fiber":0,"salt":0.6}},
  {"productId":"p057","name":"10品目のサラダ","brand":"ローソン","category":"サラダ","price":398,"imageUrl":"","nutrition":{"calories":95,"protein":5.2,"fat":2.5,"carbs":13.8,"fiber":5.0,"salt":0.8}},
  {"productId":"p058","name":"鮭弁当","brand":"ローソン","category":"弁当","price":498,"imageUrl":"","nutrition":{"calories":620,"protein":25.8,"fat":15.2,"carbs":92.5,"fiber":2.0,"salt":3.2}},
  {"productId":"p059","name":"低糖質パン","brand":"ローソン","category":"パン","price":150,"imageUrl":"","nutrition":{"calories":85,"protein":8.5,"fat":3.2,"carbs":5.8,"fiber":8.5,"salt":0.5}},
  {"productId":"p060","name":"きんぴらごぼう","brand":"セブンイレブン","category":"おかず","price":158,"imageUrl":"","nutrition":{"calories":82,"protein":1.5,"fat":2.8,"carbs":13.2,"fiber":3.5,"salt":1.2}}
]'

echo "$PRODUCTS" | python3 -c "
import json, sys, subprocess

products = json.load(sys.stdin)
for p in products:
    nutrition = p.pop('nutrition')
    item = {
        'productId': {'S': p['productId']},
        'name': {'S': p['name']},
        'brand': {'S': p['brand']},
        'category': {'S': p['category']},
        'price': {'N': str(p['price'])},
        'imageUrl': {'S': p['imageUrl']},
        'nutrition': {'M': {
            'calories': {'N': str(nutrition['calories'])},
            'protein': {'N': str(nutrition['protein'])},
            'fat': {'N': str(nutrition['fat'])},
            'carbs': {'N': str(nutrition['carbs'])},
            'fiber': {'N': str(nutrition['fiber'])},
            'salt': {'N': str(nutrition['salt'])}
        }}
    }
    subprocess.run([
        'aws', 'dynamodb', 'put-item',
        '--endpoint-url', 'http://localhost:8000',
        '--table-name', 'konbini-products',
        '--item', json.dumps(item)
    ], capture_output=True)
    sys.stdout.write('.')
    sys.stdout.flush()
print()
print(f'Seeded {len(products)} products.')
"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "DynamoDB Local: $ENDPOINT"
echo ""
echo "To start the Go API with local DynamoDB:"
echo "  cd apps/api"
echo "  DYNAMODB_ENDPOINT=$ENDPOINT AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy go run cmd/lambda/main.go"
echo ""
echo "To start the Expo app:"
echo "  cd apps/mobile"
echo "  pnpm start"
