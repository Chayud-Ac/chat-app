package health_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/health"
)

type stubDB struct{ err error }

func (s *stubDB) Ping(_ context.Context) error { return s.err }

type stubRedis struct{ err error }

func (s *stubRedis) Ping(_ context.Context) error { return s.err }

func TestHealthzHappyPath(t *testing.T) {
	h := health.NewHandler(&stubDB{}, &stubRedis{})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	h.Healthz(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}

	var body struct {
		DB    string `json:"db"`
		Redis string `json:"redis"`
	}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.DB != "ok" {
		t.Errorf("db=%q, want ok", body.DB)
	}
	if body.Redis != "ok" {
		t.Errorf("redis=%q, want ok", body.Redis)
	}
}
