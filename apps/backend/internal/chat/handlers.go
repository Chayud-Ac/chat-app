package chat

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform/httputil"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const maxContentLen = 10000

type Handlers struct {
	svc *Service
}

func NewHandlers(svc *Service) *Handlers {
	return &Handlers{svc: svc}
}

func (h *Handlers) createConversation(w http.ResponseWriter, r *http.Request) {
	conv, err := h.svc.CreateConversation(r.Context())
	if err != nil {
		httputil.WriteError(w, r, http.StatusInternalServerError, "could not create conversation", err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, conv)
}

func (h *Handlers) listConversations(w http.ResponseWriter, r *http.Request) {
	convs, err := h.svc.ListConversations(r.Context())
	if err != nil {
		httputil.WriteError(w, r, http.StatusInternalServerError, "could not list conversations", err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, convs)
}

func (h *Handlers) getConversation(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	conv, err := h.svc.GetConversation(r.Context(), id)
	if errors.Is(err, ErrConversationNotFound) {
		httputil.WriteError(w, r, http.StatusNotFound, "conversation not found", err)
		return
	}
	if err != nil {
		httputil.WriteError(w, r, http.StatusInternalServerError, "could not get conversation", err)
		return
	}
	msgs, err := h.svc.Messages(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, r, http.StatusInternalServerError, "could not load messages", err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"conversation": conv, "messages": msgs})
}

type sendMessageRequest struct {
	Content string `json:"content"`
}

// sendMessage stream คำตอบเป็น SSE ของ ChatChunk: {type:"delta"} ... {type:"done"} | {type:"error"}.
func (h *Handlers) sendMessage(w http.ResponseWriter, r *http.Request) {
	id, ok := parseID(w, r)
	if !ok {
		return
	}
	var req sendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, r, http.StatusBadRequest, "invalid json", err)
		return
	}
	if req.Content == "" {
		httputil.WriteError(w, r, http.StatusBadRequest, "content is required", nil)
		return
	}
	if len(req.Content) > maxContentLen {
		httputil.WriteError(w, r, http.StatusBadRequest, "content too long", nil)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		httputil.WriteError(w, r, http.StatusInternalServerError, "streaming unsupported", nil)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	onDelta := func(text string) {
		writeChunk(w, map[string]string{"type": "delta", "text": text})
		flusher.Flush()
	}

	asst, err := h.svc.SendMessage(r.Context(), id, req.Content, onDelta)
	if err != nil {
		// PII-safe: log โครงสร้าง error ไม่ใช่เนื้อ message
		slog.ErrorContext(r.Context(), "chat.sendMessage", "conversation_id", id, "err", err)
		writeChunk(w, map[string]string{"type": "error", "message": "could not complete response"})
		flusher.Flush()
		return
	}
	writeChunk(w, map[string]any{"type": "done", "message": asst})
	flusher.Flush()
}

// --- helpers ---

func parseID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httputil.WriteError(w, r, http.StatusBadRequest, "invalid conversation id", err)
		return uuid.Nil, false
	}
	return id, true
}

func writeChunk(w http.ResponseWriter, chunk any) {
	b, _ := json.Marshal(chunk)
	_, _ = w.Write([]byte("data: "))
	_, _ = w.Write(b)
	_, _ = w.Write([]byte("\n\n"))
}
