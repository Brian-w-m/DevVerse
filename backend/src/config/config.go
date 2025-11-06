package config

import (
	"os"
	"strconv"
)

type Config struct {
	AppName  string
	AppEnv   string
	Port     int
	LogLevel string
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
		AppName:  getEnv("APP_NAME", DefaultAppName),
		AppEnv:   getEnv("APP_ENV", DefaultAppEnv),
		Port:     getEnvInt("PORT", DefaultPort),
		LogLevel: getEnv("LOG_LEVEL", DefaultLogLevel),
	}
}
