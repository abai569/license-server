package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"license-server/internal/config"
	"license-server/internal/handler"
	"license-server/internal/middleware"
	"license-server/internal/repo"
)

var (
	Version   = "unknown"
	GitCommit = "unknown"
	BuildTime = "unknown"
)

func main() {
	flag.Parse()
	if len(os.Args) > 1 && os.Args[1] == "version" {
		fmt.Printf(
			"license-server\nversion: %s\ncommit: %s\nbuild: %s\n",
			Version,
			GitCommit,
			BuildTime,
		)
		return
	}

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

	// 添加静态文件服务（前端页面）
	distPath := os.Getenv("FRONTEND_DIST_PATH")
	if distPath == "" {
		execDir, err := os.Getwd()
		if err != nil {
			execDir = "."
		}
		distPath = filepath.Join(execDir, "dist")
	}
	if f, err := os.Stat(distPath); err == nil && f.IsDir() {
		// 处理 /assets/ 路径的静态文件
		assetsPath := filepath.Join(distPath, "assets")
		if _, err := os.Stat(assetsPath); err == nil {
			assetsHandler := http.FileServer(http.Dir(assetsPath))
			mux.Handle("/assets/", http.StripPrefix("/assets/", assetsHandler))
		}

		// 处理根路径的静态文件和 SPA 路由
		staticHandler := http.FileServer(http.Dir(distPath))
		mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// API 路由优先
			if strings.HasPrefix(r.URL.Path, "/api/") {
				mux.ServeHTTP(w, r)
				return
			}
			// SPA 路由支持：如果文件不存在，返回 index.html
			filePath := filepath.Join(distPath, r.URL.Path)
			if _, err := os.Stat(filePath); os.IsNotExist(err) {
				r.URL.Path = "/index.html"
			}
			staticHandler.ServeHTTP(w, r)
		}))
		log.Printf("serving frontend files from %s", distPath)
	} else {
		log.Printf("warning: dist directory not found at %s", distPath)
	}

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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("warning: server shutdown failed: %v", err)
	}

	log.Println("server stopped")
}
