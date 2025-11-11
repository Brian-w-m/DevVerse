package routes

import (
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

// Register wires all route groups
func Register(r *gin.Engine, dynamodbClient *dynamodb.Client, cfg appconfig.Config, logger *utils.Logger) {
	registerHealth(r, dynamodbClient, cfg, logger)
	registerAuth(r, dynamodbClient, cfg, logger)
	// Protect user routes with JWT
	authGroup := r.Group("/")
	authGroup.Use(utils.JWTAuth(cfg.JWTSecret))
	registerUsers(authGroup, dynamodbClient, cfg, logger)
	registerJobs(r, logger)
}
