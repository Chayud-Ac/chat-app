# chat-app (monorepo)

AI chat application — 1 repo, 4 service ใน `apps/` (frontend/backend/ai-service/worker)
ดูโครงเต็มที่ `monorepo-layout.md`

## convention รวมทั้ง repo (ระดับ root)

- **data contract** ที่ share ข้าม service อยู่ที่ `packages/contracts/` — แก้ที่นี่ที่เดียว ทุก service เห็นพร้อมกัน
- **commit**: conventional commits (`feat:` / `fix:` / `docs:`)
- **branch**: `feat/issue-<n>` ต่อ 1 issue, ผ่าน PR เท่านั้น (main มี branch protection)
- **ห้าม log/ส่งออก PII** (ข้อความ user, token, email) ทุก service
- nested `CLAUDE.md` ใน `apps/<service>/` ให้ context เฉพาะ service นั้นเพิ่มอัตโนมัติ
- **ก่อนเขียน/แก้โค้ดทุกครั้ง ใช้ skill `anti-slop`** (no over-engineering, no orthogonal changes, verify จริง)
- review ก่อน PR: `code-reviewer` (ทุก service) + `ai-reviewer` (เฉพาะ ai-service) + `contract-guardian` (เฉพาะ contracts) — แยก scope ไม่ทับกัน

## map service (data flow)

```
client ─SSE→ frontend ─HTTP→ backend ─RPC→ ai-service
                              └─enqueue→ queue → worker → ai-service
```

## commands ต่อ service (ดูเพิ่มใน nested CLAUDE.md)
- backend (Go): `go test ./...`, `golangci-lint run`
- frontend (Node): `pnpm test`, `pnpm lint`
- ai-service / worker (Python): `pytest`, `ruff check`

> เก็บไฟล์นี้ < 500 tokens — รายละเอียดเชิงลึกอยู่ใน nested CLAUDE.md ของแต่ละ service
