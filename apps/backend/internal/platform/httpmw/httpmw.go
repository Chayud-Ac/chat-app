// Package httpmw มี HTTP middleware ที่ share ข้าม domain: request id, access log, panic recovery.
// repo house style: middleware/wiring อยู่ใน platform ไม่ปนกับ handler logic ของแต่ละ domain.
package httpmw

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/go-chi/chi/v5/middleware"

	"github.com/Chayud-Ac/chat-app/apps/backend/internal/platform"
)

const requestIDHeader = "X-Request-Id"

// RequestID gen request id ฝั่ง server เอง (ไม่ trust X-Request-Id จาก client = กัน log injection/spoof),
// แนบลง context (platform key ที่ logger อ่าน) และ echo เป็น response header.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := newRequestID()
		w.Header().Set(requestIDHeader, id)
		ctx := platform.ContextWithRequestID(r.Context(), id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// newRequestID คืน hex 16 ตัว (8 byte สุ่ม). crypto/rand บนเครื่องที่มี OS RNG ไม่พลาด.
func newRequestID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// RequestLogger log หนึ่งบรรทัดต่อ request ที่จบ: method, path, status, bytes, duration_ms (+ request_id จาก context).
// PII-safe: log แค่ metadata ไม่แตะ query string / header / body.
func RequestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			start := time.Now()
			defer func() {
				logger.InfoContext(r.Context(), "http request",
					"method", r.Method,
					"path", r.URL.Path,
					"status", ww.Status(),
					"bytes", ww.BytesWritten(),
					"duration_ms", time.Since(start).Milliseconds(),
				)
			}()
			next.ServeHTTP(ww, r)
		})
	}
}

// Recoverer จับ panic, log แบบ PII-safe (ไม่ส่ง detail ให้ client) แล้วตอบ 500.
func Recoverer(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.ErrorContext(r.Context(), "panic recovered",
						"panic", rec,
						"stack", string(debug.Stack()),
					)
					w.WriteHeader(http.StatusInternalServerError)
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
