package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Brian-w-m/DevVerse/backend/src/appconfig"
	"github.com/Brian-w-m/DevVerse/backend/src/database"
	"github.com/Brian-w-m/DevVerse/backend/src/routes"
	"github.com/Brian-w-m/DevVerse/backend/src/utils"
)

func main() {
	// Load config
	cfg := appconfig.Load()

	// Setup logger
	logger := utils.NewLogger(cfg.LogLevel)
	logger.Info("starting server")

	// Initialise DynamoDB client
	dynamodbClient, err := database.NewDynamoDBClient(cfg)
	if err != nil {
		log.Fatalf("failed to initialise DynamoDB client: %v", err)
	}
	logger.Infof("DynamoDB client initialised (region: %s, endpoint: %s, table: %s)",
		cfg.AWSRegion, cfg.DynamoDBEndpoint, cfg.DynamoDBTable)

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)

	// Create Gin router
	r := gin.New()
	r.Use(gin.Recovery())

	// Register routes
	routes.Register(r, dynamodbClient, cfg, logger)

	addr := fmt.Sprintf(":%d", cfg.Port)

	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	// Graceful shutdown setup
	go func() {
		logger.Infof("listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Errorf("server error: %v", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Errorf("server forced to shutdown: %v", err)
	}

	logger.Info("server exited")
}
