package main

import (
	"log"
	"net/http"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/health"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

func main() {
	cfg, err := platform.LoadConfig()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	db, err := platform.NewDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}

	rdb := platform.NewRedis(cfg.RedisAddr)

	mux := http.NewServeMux()
	health.Register(mux, health.NewHandler(db, rdb))

	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}
