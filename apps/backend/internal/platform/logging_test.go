package platform_test

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

func TestNewLoggerJSONFormat(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	logger.Info("hello", "k", "v")

	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatalf("json format should emit JSON: %v (got %q)", err, buf.String())
	}
	if line["msg"] != "hello" || line["k"] != "v" {
		t.Errorf("unexpected log line: %v", line)
	}
}

func TestNewLoggerTextFormat(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "text")

	logger.Info("hello", "k", "v")

	out := buf.String()
	if json.Valid(bytes.TrimSpace(buf.Bytes())) {
		t.Errorf("text format should not emit JSON, got %q", out)
	}
	if !strings.Contains(out, "msg=hello") || !strings.Contains(out, "k=v") {
		t.Errorf("unexpected log line: %q", out)
	}
}

func TestNewLoggerAddsRequestIDFromContext(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	ctx := platform.ContextWithRequestID(context.Background(), "req-123")
	logger.InfoContext(ctx, "hello")

	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatal(err)
	}
	if line["request_id"] != "req-123" {
		t.Errorf("request_id=%v, want req-123", line["request_id"])
	}
}

func TestNewLoggerNoRequestIDWhenAbsent(t *testing.T) {
	var buf bytes.Buffer
	logger := platform.NewLogger(&buf, "json")

	logger.InfoContext(context.Background(), "hello")

	var line map[string]any
	if err := json.Unmarshal(buf.Bytes(), &line); err != nil {
		t.Fatal(err)
	}
	if _, ok := line["request_id"]; ok {
		t.Errorf("request_id should be absent when not in context, got %v", line["request_id"])
	}
}
