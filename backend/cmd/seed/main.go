package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/database"
)

type User struct {
	ID    string `dynamodbav:"ID"`
	Name  string `dynamodbav:"Name"`
	Email string `dynamodbav:"Email"`
	Score int    `dynamodbav:"Score"`
}

func main() {
	// Load config
	cfg := appconfig.Load()

	// Initialize DynamoDB client
	dynamodbClient, err := database.NewDynamoDBClient(cfg)
	if err != nil {
		log.Fatalf("failed to initialize DynamoDB client: %v", err)
	}

	ctx := context.Background()

	// Seed users
	users := []User{
		{
			ID:    "dev-user-001",
			Name:  "Developer",
			Email: "dev@example.com",
			Score: 4250,
		},
		{
			ID:    "user-1",
			Name:  "Alex Chen",
			Email: "alex@example.com",
			Score: 5840,
		},
		{
			ID:    "user-2",
			Name:  "Jordan Smith",
			Email: "jordan@example.com",
			Score: 5320,
		},
		{
			ID:    "user-3",
			Name:  "Casey Parker",
			Email: "casey@example.com",
			Score: 4890,
		},
		{
			ID:    "user-4",
			Name:  "Morgan Lee",
			Email: "morgan@example.com",
			Score: 4560,
		},
	}

	for _, user := range users {
		item, err := attributevalue.MarshalMap(user)
		if err != nil {
			log.Printf("failed to marshal user %s: %v", user.ID, err)
			continue
		}

		_, err = dynamodbClient.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: &cfg.DynamoDBTable,
			Item:      item,
		})
		if err != nil {
			log.Printf("failed to put item for user %s: %v", user.ID, err)
			continue
		}

		log.Printf("✓ Seeded user: %s (%s)", user.Name, user.Email)
	}

	fmt.Println("\nSeeding complete! Users added to DynamoDB.")
}
