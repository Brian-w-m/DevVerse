package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"

	"github.com/brian/devverse-backend/src/config"
	"github.com/brian/devverse-backend/src/routes"
	"github.com/brian/devverse-backend/src/utils"
)

func main() {
	// Load config
	cfg := config.Load()

	// Setup logger
	logger := utils.NewLogger(cfg.LogLevel)
	logger.Info("starting server")

	// Router
	r := mux.NewRouter()
	routes.Register(r, logger)

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
