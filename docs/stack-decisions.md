# Stack Decisions — pin อะไร ปล่อย agent อะไร

> ตอบคำถาม: "ต้องระบุ framework/version/dependency ละเอียดตั้งแต่แรกไหม หรือให้ Claude plan เอง?"
> **กฎเดียว:** pin สิ่งที่ "เปลี่ยนทีหลังแพง" (decision) · ปล่อยสิ่งที่ "เปลี่ยนทีหลังถูก" (detail)
> decision ที่ pin ไว้ที่นี่ ถูก encode ลง nested CLAUDE.md / skill แล้ว — agent อ่านเอง ไม่ต้องใส่ใน prompt ทุกครั้ง

## ทำไมต้องแบ่งแบบนี้

- **decision (pin):** ลงทางผิดแล้วถอยยาก (P5 stuck-in-path). lock ที่ human gate #1 (plan) ก่อนเขียนโค้ด
- **detail (ปล่อย):** agent ตัดสินใจตอน implement ได้ ผิดก็แก้ถูก — pin ไปก็แค่ทำให้ prompt ยาว + จำกัด agent โดยไม่จำเป็น

---

## ตาราง decision ทั้ง 4 service

| Service | ✅ Pin (decision) | 🔵 ปล่อย agent (detail) |
|---------|------------------|------------------------|
| **backend** (Go) | package-per-domain (`internal/{auth,payments,...}`), **sqlc** (ไม่ใช่ ORM), **golang-migrate**, Postgres, **Asynq** (enqueue), `cmd/` entry, adapters/platform layer | router (chi/std), auth detail (JWT/session), DI pattern, ชื่อ function/package ย่อย |
| **ai-service** (Python) | FastAPI, Pydantic v2, async, RAG แยก stage, **pgvector** (embedding ใน Postgres) | chunk size/overlap, embedding model id, top-k |
| **worker** (Go) | **Asynq consumer**, Redis, idempotent job, queue contract ใน `packages/contracts/` | retry/backoff config, concurrency number |
| **frontend** (Node) | Next.js 16 server-first, Tailwind v4, shadcn AI Elements, AI SDK v5 **useChat**, **React Query** (server state), **ไม่มี global store** (YAGNI) | component detail, layout, styling เฉพาะจุด |

## Infra (pin)

| | decision |
|---|---|
| primary DB | **Postgres** (sqlc + golang-migrate) |
| vector | **pgvector** ใน Postgres เดียวกัน — ไม่แยก vector DB (lean สำหรับ portfolio; scale ค่อยแยก Pinecone/Weaviate ทีหลัง) |
| queue + cache | **Redis** (Asynq job queue + cache) |
| local dev | `docker-compose.yml` (Postgres+pgvector+Redis) — ดู `templates/infra/` |

---

## reference: house style ของ Go (จาก repo GOLANG-PRACTICE จริง)

backend ดู repo `GOLANG-PRACTICE` เป็น structure reference — pattern ที่ pin:

```
cmd/                    ← entry point (main minimal: wire + Run())
internal/
  ├── auth/             ← package-per-domain (ไม่ใช่ technical layer)
  ├── payments/
  ├── tickets/
  ├── users/
  ├── events/
  ├── adapters/         ← DB / external service adapter
  ├── platform/         ← shared infra (config, logger, db pool)
  └── cache/
migrations/             ← NNNN_name.sql (golang-migrate, timestamp prefix)
sqlc.yaml               ← sqlc codegen config
docker-compose.yml
```

- **error handling** → ตาม skill `golang-error-handling` (sentinel, `%w`, `errors.Is/As`)
- **routes แยกจาก handlers**, package ตาม domain ไม่ตาม layer

---

## ของที่จงใจ "ไม่ pin" (YAGNI สำหรับ portfolio)

- ❌ router/auth/DI library — ปล่อย planner เสนอที่ gate #1
- ❌ k8s manifest / helm — docker-compose พอสำหรับ portfolio
- ❌ แยก vector DB — pgvector พอ
- ❌ multi-region / sharding — over-engineer

> ถ้า planner เสนอ router/auth ตอน plan แล้วคุณ approve → มันจะกลายเป็น decision ที่ค่อย pin ลง CLAUDE.md ทีหลังได้

---

## Claude automation — gaps พบในรัน issue #7

ค้นพบระหว่างรัน issue #7 (หลัง PR #8 merge เข้า main):

### Gap 1: Claude อ่าน GitHub issue ไม่ได้

`gh issue view` / `gh issue list` ไม่ได้อยู่ใน allowed tools → Claude ไม่เห็น issue body ใน CI run

**แก้:** เพิ่ม `Bash(gh issue view:*)` และ `Bash(gh issue list:*)` ใน:
1. `.github/workflows/claude.yml` → `claude_args --allowedTools`
2. `.claude/settings.json` → `allow` list (สำหรับ local interactive use)

เพิ่มเติม — inject issue body ลงใน `prompt:` ตรงๆ สำหรับ trigger `issues: assigned`:
```yaml
prompt: |
  ${{ github.event.action == 'assigned' && format('Issue #{0}: {1}\n\n{2}\n\nImplement via claude/issue-{0} branch, open PR "Closes #{0}".', github.event.issue.number, github.event.issue.title, github.event.issue.body) || 'Implement the triggering comment request. Create branch claude/issue-<n>, commit, push, open PR.' }}
```

### Gap 2: Claude push workflow file ไม่ได้

GitHub App token (`ghs_*`) ไม่มี `workflows` permission → push ที่แตะ `.github/workflows/*` ถูก reject

**แก้ (admin action):** ใน GitHub App installation settings → เพิ่ม Workflows (read & write) permission
หรือ ใช้ PAT ที่มี `workflow` scope ใน `actions/checkout@v4` (`token:` input)

**สถานะ issue #7:** ยัง implement ไม่ได้เพราะอ่าน issue body ไม่ได้ — หลัง apply fix แล้ว ให้ re-assign issue #7 ให้ `claude[bot]` อีกครั้ง
