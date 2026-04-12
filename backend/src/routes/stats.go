package routes

import (
	"net/http"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerStats(r gin.IRoutes, dynamodbClient *dynamodb.Client, cfg appconfig.Config, logger *utils.Logger) {
	statsService := services.NewStatsService(dynamodbClient, cfg.DynamoDBTable)

	r.GET("/stats/:id", func(c *gin.Context) {
		userID := c.Param("id")
		stats, err := statsService.GetUserStats(c.Request.Context(), userID)
		if err != nil {
			logger.Errorf("failed to get user stats: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
			return
		}
		if stats == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusOK, stats)
	})

	r.GET("/leaderboard", func(c *gin.Context) {
		limitStr := c.DefaultQuery("limit", "10")
		limit, err := strconv.Atoi(limitStr)
		if err != nil || limit > 100 {
			limit = 10
		}

		leaderboard, err := statsService.GetLeaderboard(c.Request.Context(), limit)
		if err != nil {
			logger.Errorf("failed to get leaderboard: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get leaderboard"})
			return
		}
		c.JSON(http.StatusOK, leaderboard)
	})

	r.GET("/activity/:id", func(c *gin.Context) {
		userID := c.Param("id")
		activity, err := statsService.GetActivityData(c.Request.Context(), userID)
		if err != nil {
			logger.Errorf("failed to get activity data: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get activity data"})
			return
		}
		c.JSON(http.StatusOK, activity)
	})
}
