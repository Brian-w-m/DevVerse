package routes

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/brian/devverse-backend/src/utils"
)

func registerHealth(r *mux.Router, logger *utils.Logger) {
	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		utils.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)
}
