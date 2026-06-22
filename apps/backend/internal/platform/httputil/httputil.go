// Package httputil มี helper สำหรับเขียน HTTP response ที่ share ข้าม domain package.
// repo house style: response helper อยู่ที่นี่ที่เดียว — ห้าม re-roll json.NewEncoder ในแต่ละ handler.
package httputil

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// WriteJSON เขียน v เป็น JSON พร้อม status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError ตอบ error เป็น JSON {"error": msg} และ log err แบบ PII-safe (โครงสร้าง ไม่ใช่เนื้อ message).
// msg = ข้อความ public ที่ส่งให้ client; err = error จริงไว้ log (nil ได้ถ้าไม่มี).
func WriteError(w http.ResponseWriter, r *http.Request, status int, msg string, err error) {
	if err != nil {
		slog.ErrorContext(r.Context(), "http error", "status", status, "err", err)
	}
	WriteJSON(w, status, map[string]string{"error": msg})
}
