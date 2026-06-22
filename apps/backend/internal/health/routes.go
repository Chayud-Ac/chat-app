package health

import "github.com/go-chi/chi/v5"

func Register(r chi.Router, h *Handler) {
	r.Get("/healthz", h.Healthz)
}
