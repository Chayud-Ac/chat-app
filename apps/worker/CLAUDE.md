# apps/worker (Python/Go + queue)

> วางเป็น `apps/worker/CLAUDE.md`

async job: heavy RAG, batch embedding, ingest เอกสาร — ดึงจาก **Redis queue (Asynq)**

## Stack (pinned — ดู stack-decisions.md)
- **Go + Asynq consumer** (worker ดึง job จาก Redis ที่ backend enqueue)
- เรียก ai-service ตอนประมวลผล background (RAG/embedding)

## Commands
- test: `go test ./...`
- lint: `golangci-lint run`

## Conventions
- **job ต้อง idempotent** — กันรันซ้ำ (Asynq redelivery เมื่อ fail/timeout)
- **queue job payload schema → import จาก `packages/contracts/`** ตัวเดียวกับที่ backend ใช้ enqueue (producer/consumer ห้าม drift)
- error handling → skill `golang-error-handling`
- **ห้าม log PII** จากเนื้อหา job
- retry/backoff/concurrency = 🔵 ปล่อยให้ปรับตอน implement (ไม่ pin)
