package services

import "github.com/Brian-w-m/DevVerse/backend/src/models"

type UserService struct{}

func NewUserService() *UserService { return &UserService{} }

func (s *UserService) ListUsers() []models.User {
	return []models.User{
		{ID: "1", Name: "Alice", Email: "alice@example.com"},
		{ID: "2", Name: "Bob", Email: "bob@example.com"},
	}
}

func (s *UserService) GetUserByID(id string) (models.User, bool) {
	for _, u := range s.ListUsers() {
		if u.ID == id {
			return u, true
		}
	}
	return models.User{}, false
}
