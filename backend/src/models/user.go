package models

type User struct {
	ID    string `json:"id" dynamodbav:"ID"`
	Name  string `json:"name" dynamodbav:"Name"`
	Email string `json:"email" dynamodbav:"Email"`
	Score int    `json:"score" dynamodbav:"Score"`
}

// TODO 1.5 #1: Create backend/src/models/session.go with the following types.
//
// Session represents one completed coding session recorded by the extension.
//   type Session struct {
//     UserID            string            `dynamodbav:"UserID"`   // PK
//     SessionID         string            `dynamodbav:"SessionID"` // SK (UUID)
//     StartedAt         int64             `dynamodbav:"StartedAt"`
//     EndedAt           int64             `dynamodbav:"EndedAt"`
//     Points            int               `dynamodbav:"Points"`
//     LanguageBreakdown map[string]int    `dynamodbav:"LanguageBreakdown"`
//   }
//
// DailyActivity is an aggregated per-user per-day record, upserted on every score add.
//   type DailyActivity struct {
//     UserID       string `dynamodbav:"UserID"`  // PK
//     Date         string `dynamodbav:"Date"`    // SK — "YYYY-MM-DD"
//     Points       int    `dynamodbav:"Points"`
//     SessionCount int    `dynamodbav:"SessionCount"`
//   }