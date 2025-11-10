package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type DynamoDBService struct {
	client *dynamodb.Client
	table string
}

func NewDynamoDBService(client *dynamodb.Client, tableName string) *DynamoDBService {
	return &DynamoDBService{
		client: client,
		table: tableName,
	}
}

func (s *DynamoDBService) TableExists(ctx context.Context) (bool, error) {
	_, err := s.client.DescribeTable(ctx, &dynamodb.DescribeTableInput{
		TableName: aws.String(s.table),
	})
	if err != nil {
		var resourceNotFound *types.ResourceNotFoundException
		if errors.As(err, &resourceNotFound) {
			return false, nil
		}
		return false, fmt.Errorf("failed to describe table: %w", err)
	}
	return true, nil
}

func (s *DynamoDBService) HealthCheck(ctx context.Context) error {
	exists, err := s.TableExists(ctx)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	if !exists {
		return fmt.Errorf("table %s does not exist", s.table)
	}
	return nil
}