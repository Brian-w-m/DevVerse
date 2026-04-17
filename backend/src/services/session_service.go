package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/Brian-w-m/DevVerse/backend/src/models"
)

// SessionService handles all reads and writes for the Sessions and DailyActivity tables.
type SessionService struct {
	dynamoClient      *dynamodb.Client
	sessionsTable     string
	dailyActivityTable string
}

func NewSessionService(dynamoClient *dynamodb.Client, sessionsTable, dailyActivityTable string) *SessionService {
	return &SessionService{
		dynamoClient:       dynamoClient,
		sessionsTable:      sessionsTable,
		dailyActivityTable: dailyActivityTable,
	}
}

func (s *SessionService) RecordSession(ctx context.Context, session models.Session) error {
	sessionMap, err := attributevalue.MarshalMap(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}
	_, err = s.dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(s.sessionsTable),
		Item: sessionMap,
		ConditionExpression: aws.String("attribute_not_exists(SessionID)"),
	})
	if err != nil {
		var ccf *types.ConditionalCheckFailedException
		if errors.As(err, &ccf) {
			return nil
		}
		return err
	}
	date := time.Now().UTC().Format("2006-01-02")
	_, err = s.dynamoClient.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(s.dailyActivityTable),
		Key: map[string]types.AttributeValue{
			"UserID": &types.AttributeValueMemberS{Value: session.UserID},
			"Date":   &types.AttributeValueMemberS{Value: date},
		},
		UpdateExpression: aws.String("ADD #sessionCount :one"),
		ExpressionAttributeNames: map[string]string{
			"#sessionCount": "SessionCount",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":one": &types.AttributeValueMemberN{Value: "1"},
		},
	})
	if err != nil {
		return fmt.Errorf("failed to update daily activity: %w", err)
	}
	return nil
}

func (s *SessionService) GetStreak(ctx context.Context, userID string) (int, error) {
	result, err := s.dynamoClient.Query(ctx, &dynamodb.QueryInput{
		TableName: aws.String(s.dailyActivityTable),
		KeyConditionExpression: aws.String("UserID = :uid"),
		ScanIndexForward: aws.Bool(false),
		Limit: aws.Int32(365),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to query daily activity: %w", err)
	}
	var dailyActivities []models.DailyActivity
	err = attributevalue.UnmarshalListOfMaps(result.Items, &dailyActivities)
	if err != nil {
		return 0, fmt.Errorf("failed to unmarshal daily activities: %w", err)
	}
	streak := 0
	pointsMap := make(map[string]bool)
	for _, activity := range dailyActivities {
		if activity.Points > 0 {
			pointsMap[activity.Date] = true
		}
	}
	check := time.Now().UTC().Format("2006-01-02")
	yesterday := time.Now().UTC().AddDate(0, 0, -1).Format("2006-01-02")
	if !pointsMap[check] {
		check = yesterday
	}
	for check != "" && pointsMap[check] {
		streak++
		t, _ := time.Parse("2006-01-02", check)
		check = t.AddDate(0, 0, -1).Format("2006-01-02")
	}
	return streak, nil
}

func (s *SessionService) GetActivity(ctx context.Context, userID string, days int) ([]models.DailyActivity, error) {
	startDate := time.Now().UTC().AddDate(0, 0, -(days-1)).Format("2006-01-02")
	result, err := s.dynamoClient.Query(ctx, &dynamodb.QueryInput{
		TableName: aws.String(s.dailyActivityTable),
		KeyConditionExpression: aws.String("UserID = :uid AND #date >= :start"),
		ExpressionAttributeNames: map[string]string{
			"#date": "Date",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid":   &types.AttributeValueMemberS{Value: userID},
			":start": &types.AttributeValueMemberS{Value: startDate},
		},
		ScanIndexForward: aws.Bool(true),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query daily activity: %w", err)
	}
	var dailyActivities []models.DailyActivity
	err = attributevalue.UnmarshalListOfMaps(result.Items, &dailyActivities)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal daily activities: %w", err)
	}
	activityMap := make(map[string]models.DailyActivity)
	for _, activity := range dailyActivities {
		activityMap[activity.Date] = activity
	}
	startTime, _ := time.Parse("2006-01-02", startDate)
	endTime, _ := time.Parse("2006-01-02", time.Now().UTC().Format("2006-01-02"))
	for t := startTime; !t.After(endTime); t = t.AddDate(0, 0, 1) {
		if _, exists := activityMap[t.Format("2006-01-02")]; !exists {
			activityMap[t.Format("2006-01-02")] = models.DailyActivity{
				UserID:       userID,
				Date:         t.Format("2006-01-02"),
				Points:       0,
				SessionCount: 0,
			}
		}
	}
	activities := make([]models.DailyActivity, 0, days)
	for t := startTime; !t.After(endTime) && len(activities) < days; t = t.AddDate(0, 0, 1) {
		activities = append(activities, activityMap[t.Format("2006-01-02")])
	}
	return activities, nil
}
