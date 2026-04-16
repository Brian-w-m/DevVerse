package services

import (
	"context"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
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

// TODO 1.5 #4a: Implement RecordSession.
// Steps:
//  1. Marshal session into a DynamoDB attribute map using attributevalue.MarshalMap.
//  2. Call PutItem on s.sessionsTable with a ConditionExpression of
//     "attribute_not_exists(SessionID)" to prevent duplicate flushes from the
//     extension's offline queue.
//  3. Increment DailyActivity.SessionCount for today's date using an UpdateItem with
//     ADD SessionCount :one on s.dailyActivityTable (PK: UserID, SK: Date).
//     Use time.Now().UTC().Format("2006-01-02") for the date key.
//  4. Return any error; a ConditionalCheckFailedException on step 2 means the session
//     was already recorded — treat that as a no-op (return nil).
func (s *SessionService) RecordSession(ctx context.Context, session models.Session) error {
	// TODO 1.5 #4a: implement (see steps above)
	return nil
}

// TODO 1.5 #4b: Implement GetStreak.
// Steps:
//  1. Query DailyActivity for the given userID using a KeyConditionExpression of
//     "UserID = :uid", with ScanIndexForward = false (newest dates first) and a Limit
//     of 365 (cap the lookback to one year).
//  2. Unmarshal results into []models.DailyActivity.
//  3. Walk the slice day-by-day starting from yesterday (or today if the user has
//     already coded today). For each expected calendar date check whether a matching
//     DailyActivity row exists with Points > 0. Stop as soon as a day is missing.
//  4. Return the count of consecutive days found.
func (s *SessionService) GetStreak(ctx context.Context, userID string) (int, error) {
	// TODO 1.5 #4b: implement (see steps above)
	return 0, nil
}

// TODO 1.5 #4c: Implement GetActivity.
// Steps:
//  1. Compute the start date as time.Now().UTC().AddDate(0, 0, -(days-1)).Format("2006-01-02").
//  2. Query DailyActivity with KeyConditionExpression "UserID = :uid AND #date >= :start",
//     using ExpressionAttributeNames to alias "date" (reserved word in DynamoDB).
//     Set ScanIndexForward = true so results are sorted oldest → newest.
//  3. Unmarshal results into []models.DailyActivity.
//  4. Backfill any missing dates in the range with zero-value DailyActivity entries so
//     the dashboard chart always receives a contiguous series.
//  5. Return the slice capped at `days` entries.
func (s *SessionService) GetActivity(ctx context.Context, userID string, days int) ([]models.DailyActivity, error) {
	// TODO 1.5 #4c: implement (see steps above)
	return nil, nil
}
