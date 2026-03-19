package repository

import (
	"context"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
)

const productsTable = "Products"

// DynamoProductRepository implements ProductRepository using DynamoDB.
type DynamoProductRepository struct {
	client *dynamodb.Client
}

// NewDynamoProductRepository creates a new DynamoProductRepository.
func NewDynamoProductRepository(client *dynamodb.Client) *DynamoProductRepository {
	return &DynamoProductRepository{client: client}
}

// Search searches for products by query, brand, and category.
func (r *DynamoProductRepository) Search(ctx context.Context, query string, brand string, category string, limit int) ([]model.Product, error) {
	if limit <= 0 {
		limit = 20
	}

	// Build filter expression
	var filterParts []string
	exprAttrNames := map[string]string{}
	exprAttrValues := map[string]types.AttributeValue{}

	if query != "" {
		filterParts = append(filterParts, "contains(#name, :query)")
		exprAttrNames["#name"] = "name"
		exprAttrValues[":query"] = &types.AttributeValueMemberS{Value: query}
	}
	if brand != "" {
		filterParts = append(filterParts, "#brand = :brand")
		exprAttrNames["#brand"] = "brand"
		exprAttrValues[":brand"] = &types.AttributeValueMemberS{Value: brand}
	}
	if category != "" {
		filterParts = append(filterParts, "#category = :category")
		exprAttrNames["#category"] = "category"
		exprAttrValues[":category"] = &types.AttributeValueMemberS{Value: category}
	}

	input := &dynamodb.ScanInput{
		TableName: aws.String(productsTable),
		Limit:     aws.Int32(int32(limit)),
	}

	if len(filterParts) > 0 {
		filterExpr := strings.Join(filterParts, " AND ")
		input.FilterExpression = aws.String(filterExpr)
		input.ExpressionAttributeNames = exprAttrNames
		input.ExpressionAttributeValues = exprAttrValues
	}

	result, err := r.client.Scan(ctx, input)
	if err != nil {
		return nil, err
	}

	var products []model.Product
	err = attributevalue.UnmarshalListOfMaps(result.Items, &products)
	if err != nil {
		return nil, err
	}

	return products, nil
}

// GetByID retrieves a product by its ID.
func (r *DynamoProductRepository) GetByID(ctx context.Context, productId string) (*model.Product, error) {
	result, err := r.client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(productsTable),
		Key: map[string]types.AttributeValue{
			"productId": &types.AttributeValueMemberS{Value: productId},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, nil
	}

	var product model.Product
	err = attributevalue.UnmarshalMap(result.Item, &product)
	if err != nil {
		return nil, err
	}

	return &product, nil
}
