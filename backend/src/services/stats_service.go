package services

import (
	"context"
	"math"
	"time"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/Brian-w-m/DevVerse/backend/src/models"
)

type StatsService struct {
	dynamoClient *dynamodb.Client
	table        string
}

func NewStatsService(dynamoClient *dynamodb.Client, tableName string) *StatsService {
	return &StatsService{
		dynamoClient: dynamoClient,
		table:        tableName,
	}
}

// GetUserStats returns aggregated stats for a single user
func (s *StatsService) GetUserStats(ctx context.Context, userID string) (*models.UserStats, error) {
	// For now, just fetch the user. In production, you'd calculate edits today/week from a separate activity log
	result, err := s.dynamoClient.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &s.table,
		Key: map[string]types.AttributeValue{
			"ID": &types.AttributeValueMemberS{Value: userID},
		},
	})
	if err != nil {
		return nil, err
	}

	if result.Item == nil {
		return nil, nil
	}

	var user models.User
	err = attributevalue.UnmarshalMap(result.Item, &user)
	if err != nil {
		return nil, err
	}

	// Calculate simple metrics (in production use a separate activity log table)
	stats := &models.UserStats{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		Score:         user.Score,
		EditsToday:    int(math.Ceil(float64(user.Score) * 0.15)),     // Estimate
		EditsThisWeek: int(math.Ceil(float64(user.Score) * 0.35)),     // Estimate
		CurrentStreak: int(math.Ceil(float64(user.Score) / 100.0)),    // Estimate
		LongestStreak: int(math.Ceil(float64(user.Score) / 80.0)),     // Estimate
		LastActivityAt: time.Now().Format(time.RFC3339),
	}

	return stats, nil
}

// GetLeaderboard returns top users this week
func (s *StatsService) GetLeaderboard(ctx context.Context, limit int) ([]models.LeaderboardEntry, error) {
	// Scan all users and sort by score
	result, err := s.dynamoClient.Scan(ctx, &dynamodb.ScanInput{
		TableName: &s.table,
	})
	if err != nil {
		return nil, err
	}

	var users []models.User
	err = attributevalue.UnmarshalListOfMaps(result.Items, &users)
	if err != nil {
		return nil, err
	}

	// Sort by score (descending)
	for i := 0; i < len(users)-1; i++ {
		for j := i + 1; j < len(users); j++ {
			if users[j].Score > users[i].Score {
				users[i], users[j] = users[j], users[i]
			}
		}
	}

	// Take top N
	if limit > len(users) {
		limit = len(users)
	}

	leaderboard := make([]models.LeaderboardEntry, limit)
	for i := 0; i < limit; i++ {
		leaderboard[i] = models.LeaderboardEntry{
			Rank:   i + 1,
			ID:     users[i].ID,
			Name:   users[i].Name,
			Email:  users[i].Email,
			Score:  users[i].Score,
			Streak: int(math.Ceil(float64(users[i].Score) / 100.0)),
		}
	}

	return leaderboard, nil
}

// GetActivityData returns activity for the past 7 days
func (s *StatsService) GetActivityData(ctx context.Context, userID string) (*models.ActivityData, error) {
	// Generate mock activity data for last 7 days
	activity := &models.ActivityData{
		Days:          []models.ActivityDay{},
		TotalThisWeek: 0,
	}

	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		// Mock: random activity (in production, fetch from activity log)
		count := int((date.Unix() % 150) + 10)
		activity.Days = append(activity.Days, models.ActivityDay{
			Date:  date.Format("2006-01-02"),
			Count: count,
		})
		activity.TotalThisWeek += count
	}

	return activity, nil
}
