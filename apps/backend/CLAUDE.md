# apps/backend (Go)

> วางเป็น `apps/backend/CLAUDE.md`

API gateway: auth, session, orchestrate ไป ai-service, stream กลับ client (SSE/WebSocket), ส่ง async job เข้า queue

## Stack (pinned — ดู stack-decisions.md)
- Go 1.2x, SSE/WebSocket streaming
- **DB:** Postgres + **sqlc** (codegen จาก SQL — ไม่ใช่ ORM) + **golang-migrate** (`migrations/NNNN_name.sql`)
- **queue:** **Asynq** — backend เป็น producer (enqueue job ให้ worker ผ่าน Redis)
- **structure reference:** ดู repo `GOLANG-PRACTICE` เป็นต้นแบบ (`cmd/`, `internal/{domain}/`, `internal/adapters/`, `internal/platform/`, `sqlc.yaml`)
- 🔵 *ปล่อยให้ planner เสนอ:* router (chi/std), auth strategy (JWT/session), DI pattern — ไม่ pin ตั้งแต่แรก

## Commands
- test: `go test ./...`
- vet: `go vet ./...`
- lint: `golangci-lint run`
- migrate: `migrate -path migrations -database $DATABASE_URL up`
- sqlc: `sqlc generate`

## Conventions
- **error handling → ตาม skill `golang-error-handling`** (sentinel error, `%w` wrapping, `errors.Is/As`, single-handling rule) — ไม่เขียนกฎซ้ำที่นี่
- ทั่วไปอ้าง `golang-*` skills (golang-code-style, golang-naming, golang-testing) ตามสถานการณ์

### house style ที่ skill ไม่ครอบ (เฉพาะ repo นี้)
- **package-per-domain**: จัด `internal/` ตาม domain (`internal/chat/`, `internal/session/`) ไม่ใช่ตาม technical layer
- **routes แยกจาก handlers**: นิยาม route/wiring ไว้คนละไฟล์กับ handler logic (เช่น `routes.go` ↔ `handlers.go`)
- **HTTP response helper รวมที่เดียว**: ใช้ `internal/platform/httputil` (`WriteJSON`, `WriteError`) — **ห้าม** re-roll `json.NewEncoder` หรือนิยาม `writeJSON`/`writeError` ซ้ำในแต่ละ domain package
- **ห้าม log PII** (ข้อความ user, token, email) — มี hook block อยู่
- `internal/auth/` และ `internal/payment/` = sensitive ทุก PR ต้องผ่าน CODEOWNERS review
- **HTTP request/response schema** + **queue job payload** (ที่ enqueue ให้ worker) import จาก `packages/contracts/` — producer/consumer ใช้ตัวเดียวกัน
