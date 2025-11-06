package routes

import (
	"net/http"

	"github.com/gorilla/mux"
	"github.com/brian/devverse-backend/src/services"
	"github.com/brian/devverse-backend/src/utils"
)

func registerUsers(r *mux.Router, logger *utils.Logger) {
	userService := services.NewUserService()

	r.HandleFunc("/users", func(w http.ResponseWriter, _ *http.Request) {
		users := userService.ListUsers()
		utils.JSON(w, http.StatusOK, users)
	}).Methods(http.MethodGet)

	r.HandleFunc("/users/{id}", func(w http.ResponseWriter, req *http.Request) {
		id := mux.Vars(req)["id"]
		user, found := userService.GetUserByID(id)
		if !found {
			utils.JSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
			return
		}
		utils.JSON(w, http.StatusOK, user)
	}).Methods(http.MethodGet)
}
