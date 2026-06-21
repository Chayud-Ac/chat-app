package health

import (
	"context"
	"encoding/json"
	"net/http"
)

type DBPinger interface {
	Ping(ctx context.Context) error
}

type RedisPinger interface {
	Ping(ctx context.Context) error
}

type Handler struct {
	db    DBPinger
	redis RedisPinger
}

func NewHandler(db DBPinger, redis RedisPinger) *Handler {
	return &Handler{db: db, redis: redis}
}

type healthResponse struct {
	DB    string `json:"db"`
	Redis string `json:"redis"`
}

func (h *Handler) Healthz(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	resp := healthResponse{DB: "ok", Redis: "ok"}
	status := http.StatusOK

	if err := h.db.Ping(ctx); err != nil {
		resp.DB = "error"
		status = http.StatusServiceUnavailable
	}
	if err := h.redis.Ping(ctx); err != nil {
		resp.Redis = "error"
		status = http.StatusServiceUnavailable
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}
