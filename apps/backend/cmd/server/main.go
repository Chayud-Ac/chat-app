package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/health"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

func main() {
	cfg, err := platform.LoadConfig()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}

	db, err := platform.NewDB(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db", "err", err)
		os.Exit(1)
	}

	rdb := platform.NewRedis(cfg.RedisAddr)

	mux := http.NewServeMux()
	health.Register(mux, health.NewHandler(db, rdb))

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: mux,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("server listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	stop()

	slog.Info("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "err", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}
