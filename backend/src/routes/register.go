package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

// Register wires all route groups
func Register(r *gin.Engine, logger *utils.Logger) {
	registerHealth(r, logger)
	registerUsers(r, logger)
	registerJobs(r, logger)
}
