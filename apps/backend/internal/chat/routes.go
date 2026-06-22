package chat

import "github.com/go-chi/chi/v5"

func Register(r chi.Router, h *Handlers) {
	r.Route("/api/conversations", func(r chi.Router) {
		r.Post("/", h.createConversation)
		r.Get("/", h.listConversations)
		r.Get("/{id}", h.getConversation)
		r.Post("/{id}/messages", h.sendMessage)
	})
}
