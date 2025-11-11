package services

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/Brian-w-m/DevVerse/backend/src/models"
)

type UserService struct {
	dynamoClient *dynamodb.Client
	table        string
}

func NewUserService(dynamoClient *dynamodb.Client, tableName string) *UserService {
	return &UserService{
		dynamoClient: dynamoClient,
		table:        tableName,
	}
}

func (s *UserService) ListUsers(ctx context.Context) ([]models.User, error) {
	result, err := s.dynamoClient.Scan(ctx, &dynamodb.ScanInput{
		TableName: aws.String(s.table),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scan users: %w", err)
	}

	var users []models.User
	err = attributevalue.UnmarshalListOfMaps(result.Items, &users)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal users: %w", err)
	}

	return users, nil
}

func (s *UserService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	key, err := attributevalue.MarshalMap(map[string]string{
		"ID": id,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal key: %w", err)
	}

	result, err := s.dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.table),
		Key:       key,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if result.Item == nil {
		return nil, nil // User not found
	}

	var user models.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal user: %w", err)
	}

	return &user, nil
}

func (s *UserService) CreateUser(ctx context.Context, user models.User) error {
	item, err := attributevalue.MarshalMap(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %w", err)
	}

	_, err = s.dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.table),
		Item:      item,
	})
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (s *UserService) UpdateUser(ctx context.Context, user models.User) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"ID": user.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	updateExpr := "SET #name = :name, #email = :email"
	_, err = s.dynamoClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(s.table),
		Key:       key,
		UpdateExpression: aws.String(updateExpr),
		ExpressionAttributeNames: map[string]string{
			"#name":  "Name",
			"#email": "Email",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":name":  &types.AttributeValueMemberS{Value: user.Name},
			":email": &types.AttributeValueMemberS{Value: user.Email},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	return nil
}

func (s *UserService) UpdateUserScore(ctx context.Context, id string, score int) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"ID": id,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	updateExpr := "SET #score = :score"
	_, err = s.dynamoClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(s.table),
		Key: key,
		UpdateExpression: aws.String(updateExpr),
		ExpressionAttributeNames: map[string]string{
			"#score": "Score",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":score": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", score)},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to update user score: %w", err)
	}

	return nil
}

func (s *UserService) AddUserScore(ctx context.Context, id string, increment int) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"ID": id,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	updateExpr := "ADD #score :increment"
	_, err = s.dynamoClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(s.table),
		Key: key,
		UpdateExpression: aws.String(updateExpr),
		ExpressionAttributeNames: map[string]string{
			"#score": "Score",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":increment": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", increment)},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to add user score: %w", err)
	}

	return nil
}

// CreateOrUpdateUserByGitHub creates or updates a user using GitHub ID as the primary ID
func (s *UserService) CreateOrUpdateUserByGitHub(ctx context.Context, githubID string, name, email string) (*models.User, error) {
	// Check if user exists
	user, err := s.GetUserByID(ctx, githubID)
	if err != nil {
		return nil, err
	}

	if user != nil {
		// Update existing user (name and email might have changed)
		user.Name = name
		user.Email = email
		item, err := attributevalue.MarshalMap(user)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal user: %w", err)
		}

		_, err = s.dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: aws.String(s.table),
			Item:      item,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to update user: %w", err)
		}
		return user, nil
	}

	// Create new user with GitHub ID as the ID
	newUser := models.User{
		ID:    githubID, // Use GitHub ID directly as the primary ID
		Name:  name,
		Email: email,
		Score: 0,
	}

	item, err := attributevalue.MarshalMap(newUser)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal user: %w", err)
	}

	_, err = s.dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.table),
		Item:      item,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return &newUser, nil
}

func (s *UserService) DeleteUser(ctx context.Context, id string) error {
	key, err := attributevalue.MarshalMap(map[string]string{
		"ID": id,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal key: %w", err)
	}

	_, err = s.dynamoClient.DeleteItem(ctx, &dynamodb.DeleteItemInput{
		TableName: aws.String(s.table),
		Key:       key,
	})
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	return nil
}