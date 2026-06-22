package chat

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

func newTestRouter() chi.Router {
	svc := NewService(newFakeRepo(), fakeStreamer{})
	r := chi.NewRouter()
	Register(r, NewHandlers(svc))
	return r
}

func TestHandlers_CreateConversation(t *testing.T) {
	r := newTestRouter()
	req := httptest.NewRequest(http.MethodPost, "/api/conversations", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", w.Code)
	}
	var conv Conversation
	if err := json.NewDecoder(w.Body).Decode(&conv); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if conv.Title != "New chat" {
		t.Fatalf("title = %q", conv.Title)
	}
}

func TestHandlers_GetConversation_NotFound(t *testing.T) {
	r := newTestRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/conversations/"+uuid.New().String(), nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", w.Code)
	}
}

func TestHandlers_GetConversation_InvalidID(t *testing.T) {
	r := newTestRouter()
	req := httptest.NewRequest(http.MethodGet, "/api/conversations/not-a-uuid", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
}

func TestHandlers_SendMessage_EmptyContent(t *testing.T) {
	r := newTestRouter()
	// สร้าง conversation ก่อน
	cw := httptest.NewRecorder()
	r.ServeHTTP(cw, httptest.NewRequest(http.MethodPost, "/api/conversations", nil))
	var conv Conversation
	_ = json.NewDecoder(cw.Body).Decode(&conv)

	req := httptest.NewRequest(http.MethodPost, "/api/conversations/"+conv.ID.String()+"/messages",
		strings.NewReader(`{"content":""}`))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
}

func TestHandlers_SendMessage_StreamsSSE(t *testing.T) {
	r := newTestRouter()
	cw := httptest.NewRecorder()
	r.ServeHTTP(cw, httptest.NewRequest(http.MethodPost, "/api/conversations", nil))
	var conv Conversation
	_ = json.NewDecoder(cw.Body).Decode(&conv)

	req := httptest.NewRequest(http.MethodPost, "/api/conversations/"+conv.ID.String()+"/messages",
		strings.NewReader(`{"content":"hi"}`))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content-type = %q, want text/event-stream", ct)
	}
	body := w.Body.String()
	// fakeStreamer ส่ง "po","ng" แล้ว done
	if !strings.Contains(body, `"type":"delta"`) {
		t.Fatalf("body missing delta chunk: %q", body)
	}
	if !strings.Contains(body, `"type":"done"`) {
		t.Fatalf("body missing done chunk: %q", body)
	}
}
