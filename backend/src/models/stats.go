package models

type UserStats struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	Email           string `json:"email"`
	Score           int    `json:"score"`
	EditsToday      int    `json:"edits_today"`
	EditsThisWeek   int    `json:"edits_this_week"`
	CurrentStreak   int    `json:"current_streak"`
	LongestStreak   int    `json:"longest_streak"`
	LastActivityAt  string `json:"last_activity_at"`
}

type LeaderboardEntry struct {
	Rank   int    `json:"rank"`
	ID     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Score  int    `json:"score"`
	Streak int    `json:"streak"`
}

type ActivityDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type ActivityData struct {
	Days          []ActivityDay `json:"days"`
	TotalThisWeek int           `json:"total_this_week"`
}
