package platform

import (
	"context"
	"io"
	"log/slog"
)

// requestIDKey เป็น context key สำหรับเก็บ request id. unexported type กัน collision ข้าม package.
type requestIDKey struct{}

// ContextWithRequestID แนบ request id ลง context เพื่อให้ logger ดึงไปใส่ทุก log line.
func ContextWithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestIDFromContext อ่าน request id จาก context (ว่าง = ไม่มี).
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}

// NewLogger สร้าง slog.Logger ที่เขียนไป w. format "json" = JSON handler (prod),
// อื่น ๆ = text handler (dev). ทุก log ที่มี context ติด request_id อัตโนมัติ.
func NewLogger(w io.Writer, format string) *slog.Logger {
	var base slog.Handler
	if format == "json" {
		base = slog.NewJSONHandler(w, nil)
	} else {
		base = slog.NewTextHandler(w, nil)
	}
	return slog.New(&requestIDHandler{base: base})
}

// requestIDHandler ห่อ handler อื่นแล้วเติม attr request_id จาก context ถ้ามี.
type requestIDHandler struct {
	base slog.Handler
}

func (h *requestIDHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.base.Enabled(ctx, level)
}

func (h *requestIDHandler) Handle(ctx context.Context, r slog.Record) error {
	if id := RequestIDFromContext(ctx); id != "" {
		r.AddAttrs(slog.String("request_id", id))
	}
	return h.base.Handle(ctx, r)
}

func (h *requestIDHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &requestIDHandler{base: h.base.WithAttrs(attrs)}
}

func (h *requestIDHandler) WithGroup(name string) slog.Handler {
	return &requestIDHandler{base: h.base.WithGroup(name)}
}
