package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerHealth(r *gin.Engine, logger *utils.Logger) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
}
