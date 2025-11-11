package appconfig

import (
	"os"
	"strconv"
)

type Config struct {
	Port     int
	LogLevel string
	AWSRegion        string
	DynamoDBEndpoint string
	DynamoDBTable    string
	JWTSecret        string
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return def
}

func Load() Config {
	return Config{
		Port:             getEnvInt("PORT", DefaultPort),
		LogLevel:         getEnv("LOG_LEVEL", DefaultLogLevel),
		AWSRegion:        getEnv("AWS_REGION", DefaultAWSRegion),
		DynamoDBEndpoint: getEnv("DYNAMODB_ENDPOINT", ""),
		DynamoDBTable:    getEnv("DYNAMODB_TABLE", DefaultDynamoDBTable),
		JWTSecret:        getEnv("JWT_SECRET", ""),
	}
}


