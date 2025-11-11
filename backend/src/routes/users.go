package routes

import (
	"net/http"

	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/models"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerUsers(r gin.IRoutes, dynamodbClient *dynamodb.Client, cfg appconfig.Config, logger *utils.Logger) {
	userService := services.NewUserService(dynamodbClient, cfg.DynamoDBTable)

	r.GET("/users", func(c *gin.Context) {
		users, err := userService.ListUsers(c.Request.Context())
		if err != nil {
			logger.Errorf("failed to list users: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
			return
		}
		c.JSON(http.StatusOK, users)
	})

	r.GET("/users/:id", func(c *gin.Context) {
		id := c.Param("id")
		user, err := userService.GetUserByID(c.Request.Context(), id)
		if err != nil {
			logger.Errorf("failed to get user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}
		if user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusOK, user)
	})

	r.POST("/users", func(c *gin.Context) {
		var user models.User
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
		if err := userService.CreateUser(c.Request.Context(), user); err != nil {
			logger.Errorf("failed to create user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}

		c.JSON(http.StatusCreated, user)
	})

	r.PUT("/users/:id", func(c *gin.Context) {
		id := c.Param("id")
		var user models.User
		if err := c.ShouldBindJSON(&user); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		user.ID = id

		if err := userService.UpdateUser(c.Request.Context(), user); err != nil {
			logger.Errorf("failed to update user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}

		c.JSON(http.StatusOK, user)
	})

	r.PATCH("/users/:id/score", func(c *gin.Context) {
		id := c.Param("id")

		user, err := userService.GetUserByID(c.Request.Context(), id)
		if err != nil {
			logger.Errorf("failed to get user: %v", err)
			return
		}
		if user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		var updateReq struct {
			Score int `json:"score" binding:"required"`
		}
		if err := c.ShouldBindJSON(&updateReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := userService.UpdateUserScore(c.Request.Context(), id, updateReq.Score); err != nil {
			logger.Errorf("failed to update user score: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user score"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":    id,
			"score": updateReq.Score,
		})
	})

	r.PATCH("/users/:id/score/add", func(c *gin.Context) {
		id := c.Param("id")

		user, err := userService.GetUserByID(c.Request.Context(), id)
		if err != nil {
			logger.Errorf("failed to get user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}
		if user == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		var addReq struct {
			Increment int `json:"increment" binding:"required"`
		}
		if err := c.ShouldBindJSON(&addReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := userService.AddUserScore(c.Request.Context(), id, addReq.Increment); err != nil {
			logger.Errorf("failed to add user score: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add user score"})
			return
		}

		updatedUser, err := userService.GetUserByID(c.Request.Context(), id)
		if err != nil {
			logger.Errorf("failed to get updated user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get updated user"})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"id":    id,
			"score": updatedUser.Score,
		})
	})

	r.DELETE("/users/:id", func(c *gin.Context) {
		id := c.Param("id")
		if err := userService.DeleteUser(c.Request.Context(), id); err != nil {
			logger.Errorf("failed to delete user: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
			return
		}

		c.JSON(http.StatusNoContent, nil)
	})
}
