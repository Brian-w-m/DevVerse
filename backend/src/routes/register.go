package routes

import (
	"github.com/gorilla/mux"
	"github.com/brian/devverse-backend/src/utils"
)

// Register wires all route groups
func Register(r *mux.Router, logger *utils.Logger) {
	registerHealth(r, logger)
	registerUsers(r, logger)
	registerJobs(r, logger)
}
