package routes

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/brian/devverse-backend/src/services"
	"github.com/brian/devverse-backend/src/utils"
)

func registerJobs(r *mux.Router, logger *utils.Logger) {
	jobService := services.NewJobService()

	r.HandleFunc("/jobs", func(w http.ResponseWriter, _ *http.Request) {
		jobs := jobService.ListJobs()
		utils.JSON(w, http.StatusOK, jobs)
	}).Methods(http.MethodGet)
}
