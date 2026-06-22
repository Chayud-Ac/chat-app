# Frontend (Phase 4) — Handoff สำหรับ session ใหม่

> เปิด Claude Code session ใหม่ในโฟลเดอร์ repo นี้ แล้วเริ่มตามด้านล่าง.
> Backend (Phase 1–3) เสร็จ + verified end-to-end แล้ว (DeepInfra Claude streaming ทำงานจริง).

## วิธีเริ่ม session ใหม่ (พิมพ์ให้ agent)

```
อ่าน docs/superpowers/frontend-handoff.md, spec, และ plan
แล้วเริ่มทำ Phase 4 (frontend) ตาม Task 13–16
```

agent จะ:
1. `brainstorming` skill (ถ้าจำเป็น) — แต่ design ถูกตัดสินไว้แล้วใน spec, อาจข้ามไป execute ได้
2. อ่าน `apps/frontend/CLAUDE.md` + ใช้ skill `frontend-stack` (Next.js server-first, Tailwind v4, shadcn AI Elements, AI SDK v5)
3. ทำตาม plan Task 13–16

## เอกสารที่ต้องอ่าน (อยู่ใน repo แล้ว — ไม่ต้องเล่าซ้ำ)

- **spec:** `docs/superpowers/specs/2026-06-22-chat-vertical-slice-design.md`
- **plan (Task 13–16):** `docs/superpowers/plans/2026-06-22-chat-vertical-slice.md` (Phase 4)
- **contracts:** `packages/contracts/chat.ts` (Role, Conversation, Message, ChatChunk) — import จากนี่
- **frontend stack:** `apps/frontend/CLAUDE.md` + skill `frontend-stack`

## Backend API ที่ frontend ต้องต่อ (verified จริงแล้ว)

base: `http://localhost:8080`

| Method | Path | ได้อะไร |
|---|---|---|
| POST | `/api/conversations` | 201 `Conversation` |
| GET | `/api/conversations` | 200 `Conversation[]` (เรียง created_at desc) |
| GET | `/api/conversations/:id` | 200 `{ conversation, messages }` |
| POST | `/api/conversations/:id/messages` | 200 `text/event-stream` |

### SSE format (จาก POST messages) — verified
แต่ละ event เป็น `data: <json>\n\n` ของ ChatChunk:
```
data: {"type":"delta","text":"hello"}
data: {"type":"delta","text":" world"}
data: {"type":"done","message":{...assistant Message...}}
```
หรือ error: `data: {"type":"error","message":"..."}`

frontend: append `delta.text` เข้า assistant bubble ทีละ chunk, จบที่ `done` (มี persisted message), โชว์ error ที่ `error`.

## วิธีรัน backend คู่ตอน verify frontend

```bash
# 1. infra (Postgres + Redis) — ถ้ายังไม่รัน
docker compose up -d

# 2. backend (ต้องมี apps/backend/.env ที่ตั้ง ANTHROPIC_* — DeepInfra)
cd apps/backend && set -a && . ./.env && set +a && go run ./cmd/server
# healthz: curl localhost:8080/healthz → {"db":"ok","redis":"ok"}
```

> `.env` มี DeepInfra config อยู่แล้ว: `ANTHROPIC_API_KEY` (deepinfra token),
> `ANTHROPIC_BASE_URL=https://api.deepinfra.com/anthropic`,
> `ANTHROPIC_MODEL=anthropic/claude-opus-4-8`.
> ⚠️ token ตัวเก่าควร rotate (เคยหลุดในแชท) — สร้างใหม่ใน DeepInfra, ใส่ `.env` เอง อย่า paste ในแชท.

## Phase 4 tasks (จาก plan)

- **Task 13:** scaffold Next.js (TS, app router, Tailwind v4, pnpm) ใน `apps/frontend` + shadcn AI Elements + AI SDK v5. import types จาก `packages/contracts/chat.ts`.
- **Task 14:** conversation list (GET /api/conversations) + new chat (POST) + chat view (GET /:id render history ด้วย AI Elements bubbles)
- **Task 15:** ส่งข้อความ → POST /:id/messages → อ่าน SSE → append delta → จบ done → error handling. กัน XSS ตอน render markdown จาก LLM.
- **Task 16:** manual verify — พิมข้อความ → เห็น token stream → reload → conversation เก่ายังอยู่.

## ข้อควรระวัง (จาก session backend)

- frontend = **pair + manual verify** (UI test ยาก, design decision เยอะ) — ไม่ใช่ TDD แบบ backend.
- **อย่าโยน async `@claude`** สำหรับ scaffold — codegen/setup loop ทำ async ชน turn limit (backend Phase 1/2 ล้มแบบนี้ $7). pair เอง.
- CORS: backend ยังไม่มี CORS middleware — frontend dev server (localhost:3000) เรียก backend (localhost:8080) ข้าม origin อาจโดน block. ถ้าเจอ → เพิ่ม CORS ที่ backend (เป็น task เล็ก, scope ชัด).
- contract `Message.role` = `"user" | "assistant"`, field camelCase (`conversationId`, `createdAt`).

## flow handoff (ตอบคำถามที่ถามไว้)

ของถาวรอยู่ใน repo หมดแล้ว → session ใหม่อ่านเองได้ ไม่ต้องเล่าซ้ำ:
- spec/plan → `docs/superpowers/`
- contracts → `packages/contracts/`
- memory (gotchas) → โหลดอัตโนมัติทุก session
- โค้ด backend + CLAUDE.md → repo

session ใหม่ = context สะอาด แต่ต่องานได้ทันทีจากเอกสารพวกนี้.
