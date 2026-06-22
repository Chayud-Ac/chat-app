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

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	repo "github.com/Chayud-Ac/chat-app/apps/backend/internal/adapters/postgresql/sqlc"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/chat"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/health"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

func main() {
	cfg, err := platform.LoadConfig()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := platform.NewDB(cfg.DatabaseURL)
	if err != nil {
		slog.Error("db", "err", err)
		os.Exit(1)
	}

	pool, err := platform.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("pgxpool", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	rdb := platform.NewRedis(cfg.RedisAddr)

	chatSvc := chat.NewService(repo.New(pool), chat.NewAnthropicStreamer(cfg.AnthropicAPIKey, cfg.AnthropicModel))

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: cfg.CORSAllowedOrigins,
		AllowedMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowedHeaders: []string{"Content-Type"},
	}))
	health.Register(r, health.NewHandler(db, rdb))
	chat.Register(r, chat.NewHandlers(chatSvc))

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

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
