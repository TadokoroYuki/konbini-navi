#!/bin/bash
# Seeds the konbini-products table with product data
# Usage: ./seed.sh [table-name] [region]

set -euo pipefail

TABLE_NAME=${1:-konbini-products}
REGION=${2:-ap-northeast-1}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEED_FILE="${SCRIPT_DIR}/seed-products.json"

if [ ! -f "$SEED_FILE" ]; then
  echo "Error: ${SEED_FILE} not found"
  exit 1
fi

# Count total products
TOTAL=$(jq length "$SEED_FILE")
echo "Seeding ${TOTAL} products into table '${TABLE_NAME}' in region '${REGION}'..."

# DynamoDB batch-write-item supports max 25 items per request
BATCH_SIZE=25
OFFSET=0

while [ "$OFFSET" -lt "$TOTAL" ]; do
  # Build batch of PutRequest items
  BATCH=$(jq -c --arg table "$TABLE_NAME" --argjson offset "$OFFSET" --argjson size "$BATCH_SIZE" '
    {
      ($table): [
        .[$offset:$offset+$size][] |
        {
          PutRequest: {
            Item: {
              productId:  { S: .productId },
              brand:      { S: .brand },
              category:   { S: .category },
              name:       { S: .name },
              price:      { N: (.price | tostring) },
              calories:   { N: (.calories | tostring) },
              protein:    { N: (.protein | tostring) },
              fat:        { N: (.fat | tostring) },
              carbs:      { N: (.carbs | tostring) },
              fiber:      { N: (.fiber | tostring) },
              salt:       { N: (.salt | tostring) },
              imageUrl:   { S: .imageUrl }
            }
          }
        }
      ]
    }
  ' "$SEED_FILE")

  CURRENT_END=$((OFFSET + BATCH_SIZE))
  if [ "$CURRENT_END" -gt "$TOTAL" ]; then
    CURRENT_END=$TOTAL
  fi

  echo "  Writing items $((OFFSET + 1))-${CURRENT_END}..."

  aws dynamodb batch-write-item \
    --region "$REGION" \
    --request-items "$BATCH"

  OFFSET=$((OFFSET + BATCH_SIZE))
done

echo "Done! Seeded ${TOTAL} products successfully."
