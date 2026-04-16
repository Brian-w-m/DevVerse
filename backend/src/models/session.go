package models

// Session represents one completed coding session recorded by the VS Code extension.
// Stored in the Sessions DynamoDB table (PK: UserID, SK: SessionID).
type Session struct {
	UserID            string         `json:"userId"            dynamodbav:"UserID"`
	SessionID         string         `json:"sessionId"         dynamodbav:"SessionID"`
	StartedAt         int64          `json:"startedAt"         dynamodbav:"StartedAt"`
	EndedAt           int64          `json:"endedAt"           dynamodbav:"EndedAt"`
	Points            int            `json:"points"            dynamodbav:"Points"`
	LanguageBreakdown map[string]int `json:"languageBreakdown" dynamodbav:"LanguageBreakdown"`
}

// DailyActivity is an aggregated per-user per-day record.
// Upserted atomically by AddUserScore so the dashboard activity graph is always current.
// Stored in the DailyActivity DynamoDB table (PK: UserID, SK: Date).
type DailyActivity struct {
	UserID       string `json:"userId"       dynamodbav:"UserID"`
	Date         string `json:"date"         dynamodbav:"Date"`         // "YYYY-MM-DD" UTC
	Points       int    `json:"points"       dynamodbav:"Points"`
	SessionCount int    `json:"sessionCount" dynamodbav:"SessionCount"`
}
