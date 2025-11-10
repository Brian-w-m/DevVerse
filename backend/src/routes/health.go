package routes

import (
	"net/http"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerHealth(r *gin.Engine, dynamoClient *dynamodb.Client, cfg appconfig.Config, logger *utils.Logger) {
	dynamoService := services.NewDynamoDBService(dynamoClient, cfg.DynamoDBTable)

	r.GET("/health", func(c *gin.Context) {
		if err := dynamoService.HealthCheck(c.Request.Context()); err != nil {
			logger.Errorf("health check failed: %v", err)
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "unhealthy",
				"error":  err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"region":   cfg.AWSRegion,
			"endpoint": cfg.DynamoDBEndpoint,
			"table":    cfg.DynamoDBTable,
		})
	})
}