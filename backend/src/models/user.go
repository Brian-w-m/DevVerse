package models

type User struct {
	ID    string `json:"id" dynamodbav:"ID"`
	Name  string `json:"name" dynamodbav:"Name"`
	Email string `json:"email" dynamodbav:"Email"`
}