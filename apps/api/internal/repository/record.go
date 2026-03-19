package repository

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"

	"github.com/TadokoroYuki/konbini-navi/apps/api/internal/model"
)

const recordsTable = "Records"

// DynamoRecordRepository implements RecordRepository using DynamoDB.
type DynamoRecordRepository struct {
	client     *dynamodb.Client
	productRepo ProductRepository
}

// NewDynamoRecordRepository creates a new DynamoRecordRepository.
func NewDynamoRecordRepository(client *dynamodb.Client, productRepo ProductRepository) *DynamoRecordRepository {
	return &DynamoRecordRepository{
		client:      client,
		productRepo: productRepo,
	}
}

// ListByUserAndDate lists records for a user on a specific date.
// If date is empty, all records for the user are returned.
func (r *DynamoRecordRepository) ListByUserAndDate(ctx context.Context, userId string, date string) ([]model.Record, error) {
	keyCondition := "userId = :userId"
	exprAttrValues := map[string]types.AttributeValue{
		":userId": &types.AttributeValueMemberS{Value: userId},
	}

	if date != "" {
		keyCondition += " AND begins_with(SK, :date)"
		exprAttrValues[":date"] = &types.AttributeValueMemberS{Value: date}
	}

	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:                 aws.String(recordsTable),
		KeyConditionExpression:    aws.String(keyCondition),
		ExpressionAttributeValues: exprAttrValues,
	})
	if err != nil {
		return nil, err
	}

	var records []model.Record
	err = attributevalue.UnmarshalListOfMaps(result.Items, &records)
	if err != nil {
		return nil, err
	}

	// Attach product details to each record
	for i := range records {
		product, err := r.productRepo.GetByID(ctx, records[i].ProductID)
		if err != nil {
			continue // Skip if product lookup fails
		}
		records[i].Product = product
	}

	return records, nil
}

// Create creates a new record.
func (r *DynamoRecordRepository) Create(ctx context.Context, record *model.Record) error {
	// Build sort key: {date}#{recordId}
	record.SK = record.Date + "#" + record.RecordID

	item, err := attributevalue.MarshalMap(record)
	if err != nil {
		return err
	}

	_, err = r.client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(recordsTable),
		Item:      item,
	})
	return err
}

// Delete deletes a record by userId and recordId.
func (r *DynamoRecordRepository) Delete(ctx context.Context, userId string, recordId string) error {
	// We need to find the record first to get the SK
	// Query by userId and filter by recordId
	result, err := r.client.Query(ctx, &dynamodb.QueryInput{
		TableName:                 aws.String(recordsTable),
		KeyConditionExpression:    aws.String("userId = :userId"),
		FilterExpression:          aws.String("recordId = :recordId"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":userId":   &types.AttributeValueMemberS{Value: userId},
			":recordId": &types.AttributeValueMemberS{Value: recordId},
		},
	})
	if err != nil {
		return err
	}

	if len(result.Items) == 0 {
		return nil
	}

	// Extract SK from the found item
	skAttr, ok := result.Items[0]["SK"]
	if !ok {
		return nil
	}
	_, err = r.client.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(recordsTable),
		Key: map[string]types.AttributeValue{
			"userId": &types.AttributeValueMemberS{Value: userId},
			"SK":     skAttr,
		},
	})
	return err
}
