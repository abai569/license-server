package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"license-server/internal/config"
	"license-server/internal/handler"
	"license-server/internal/middleware"
	"license-server/internal/repo"
)

func main() {
	cfg := config.FromEnv()

	r, err := repo.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer r.Close()

	h := handler.NewHandler(r, cfg.JWTSecret)

	if err := r.InitAdmin(cfg.AdminUsername, cfg.AdminPassword); err != nil {
		log.Printf("warning: failed to init admin: %v", err)
	}

	mux := http.NewServeMux()
	h.Register(mux)

	wrapped := middleware.CORS(mux)
	wrapped = middleware.Recover(wrapped)
	wrapped = middleware.RequestLog(wrapped)

	srv := &http.Server{
		Addr:         cfg.Addr,
		Handler:      wrapped,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("starting license server on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}

	log.Println("server stopped")
}
