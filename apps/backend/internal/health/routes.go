package health

import "net/http"

func Register(mux *http.ServeMux, h *Handler) {
	mux.HandleFunc("GET /healthz", h.Healthz)
}
