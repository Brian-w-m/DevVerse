package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/services"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func registerJobs(r *gin.Engine, logger *utils.Logger) {
	jobService := services.NewJobService()

	r.GET("/jobs", func(c *gin.Context) {
		jobs := jobService.ListJobs()
		c.JSON(http.StatusOK, jobs)
	})
}
