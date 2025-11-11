package routes

import (
	"fmt"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerAuth(r *gin.Engine, dynamodbClient *dynamodb.Client, cfg appconfig.Config, logger *utils.Logger) {
	authService := services.NewAuthService(cfg.JWTSecret)
	userService := services.NewUserService(dynamodbClient, cfg.DynamoDBTable)

	r.POST("/auth/github", func(c *gin.Context) {
		var req struct {
			AccessToken string `json:"accessToken" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "accessToken is required"})
			return
		}

		// Verify token with GitHub
		githubUser, err := authService.VerifyGitHubToken(c.Request.Context(), req.AccessToken)
		if err != nil {
			logger.Errorf("failed to verify GitHub token: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid GitHub token"})
			return
		}

		// Convert GitHub ID to string (use as primary ID)
		githubID := fmt.Sprintf("%d", githubUser.ID)

		// Find or create user (using GitHub ID as the ID)
		user, err := userService.CreateOrUpdateUserByGitHub(
			c.Request.Context(),
			githubID,
			githubUser.Name,
			githubUser.Email,
		)
		if err != nil {
			logger.Errorf("failed to create/update user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process user"})
			return
		}

		// Generate JWT
		token, err := authService.GenerateJWT(user.ID)
		if err != nil {
			logger.Errorf("failed to generate JWT: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token": token,
			"user":  user,
		})
	})
}

