package services

import "github.com/Brian-w-m/DevVerse/backend/src/models"

type JobService struct{}

func NewJobService() *JobService { return &JobService{} }

func (s *JobService) ListJobs() []models.Job {
	return []models.Job{
		{ID: "101", Title: "Backend Engineer", Status: "open"},
		{ID: "102", Title: "Frontend Engineer", Status: "closed"},
	}
}
