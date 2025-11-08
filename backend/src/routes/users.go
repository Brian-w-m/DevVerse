package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerUsers(r *gin.Engine, logger *utils.Logger) {
	userService := services.NewUserService()

	r.GET("/users", func(c *gin.Context) {
		users := userService.ListUsers()
		c.JSON(http.StatusOK, users)
	})

	r.GET("/users/:id", func(c *gin.Context) {
		id := c.Param("id")
		user, found := userService.GetUserByID(id)
		if !found {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusOK, user)
	})
}
