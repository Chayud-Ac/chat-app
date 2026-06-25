package httpmw_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform/httpmw"
)

// logLines แยก JSON log ออกเป็นบรรทัด ๆ
func logLines(t *testing.T, buf *bytes.Buffer) []map[string]any {
	t.Helper()
	var lines []map[string]any
	for _, raw := range bytes.Split(bytes.TrimSpace(buf.Bytes()), []byte("\n")) {
		if len(raw) == 0 {
			continue
		}
		var m map[string]any
		if err := json.Unmarshal(raw, &m); err != nil {
			t.Fatalf("log line not JSON: %v (%q)", err, raw)
		}
		lines = append(lines, m)
	}
	return lines
}

func TestRequestLoggerLogsMetadata(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	h := httpmw.RequestLogger(logger)(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/chat?secret=leak", nil)
	h.ServeHTTP(httptest.NewRecorder(), req)

	lines := logLines(t, &buf)
	if len(lines) != 1 {
		t.Fatalf("want 1 log line, got %d", len(lines))
	}
	line := lines[0]
	if line["method"] != http.MethodPost {
		t.Errorf("method=%v, want POST", line["method"])
	}
	if line["path"] != "/v1/chat" {
		t.Errorf("path=%v, want /v1/chat (no query string)", line["path"])
	}
	if line["status"] != float64(http.StatusCreated) {
		t.Errorf("status=%v, want 201", line["status"])
	}
	if _, ok := line["duration_ms"]; !ok {
		t.Error("missing duration_ms")
	}
	// PII safety: query string must never appear anywhere in the log line.
	if bytes.Contains(buf.Bytes(), []byte("secret")) {
		t.Errorf("query string leaked into log: %q", buf.String())
	}
}

func TestRecovererLogsPanicAndReturns500(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	h := httpmw.RequestLogger(logger)(httpmw.Recoverer(logger)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})))

	req := httptest.NewRequest(http.MethodGet, "/boom", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d", w.Code)
	}
	// access log line still emitted, with status 500
	lines := logLines(t, &buf)
	var sawAccess bool
	for _, l := range lines {
		if l["status"] == float64(http.StatusInternalServerError) && l["path"] == "/boom" {
			sawAccess = true
		}
	}
	if !sawAccess {
		t.Errorf("expected access log line with status 500, got %v", lines)
	}
	// panic value must not leak the goroutine stack into the response body
	if bytes.Contains(w.Body.Bytes(), []byte("boom")) {
		t.Errorf("panic detail leaked to client: %q", w.Body.String())
	}
}

func TestRequestIDInjectedIntoContextAndLogged(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	var seenID string
	inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		seenID = platform.RequestIDFromContext(r.Context())
	})

	h := httpmw.RequestID(httpmw.RequestLogger(logger)(inner))

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if seenID == "" {
		t.Fatal("request id not present in handler context")
	}
	lines := logLines(t, &buf)
	if len(lines) != 1 || lines[0]["request_id"] != seenID {
		t.Errorf("access log request_id=%v, want %q", lines[0]["request_id"], seenID)
	}
	// response header echoes the id
	if w.Header().Get("X-Request-Id") != seenID {
		t.Errorf("X-Request-Id header=%q, want %q", w.Header().Get("X-Request-Id"), seenID)
	}
}

// คนนอกส่ง X-Request-Id มาเอง = untrusted → ห้าม trust/log/echo verbatim (กัน log injection + spoof).
func TestRequestIDDoesNotTrustClientHeader(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	const spoofed = "spoofed\nfake_field=evil"
	var seenID string
	inner := http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		seenID = platform.RequestIDFromContext(r.Context())
	})

	h := httpmw.RequestID(httpmw.RequestLogger(logger)(inner))

	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("X-Request-Id", spoofed)
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)

	if seenID == spoofed {
		t.Error("client-supplied X-Request-Id must not be trusted")
	}
	if w.Header().Get("X-Request-Id") == spoofed {
		t.Error("client-supplied X-Request-Id must not be echoed back")
	}
	if bytes.Contains(buf.Bytes(), []byte("fake_field")) {
		t.Errorf("client-supplied X-Request-Id leaked into log: %q", buf.String())
	}
}
