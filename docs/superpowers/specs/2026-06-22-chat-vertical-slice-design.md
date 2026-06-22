# Chat Vertical Slice — Design Spec

> **Status:** approved design, ready for implementation planning
> **Date:** 2026-06-22
> **Scope owner:** chayud

## Goal

ส่งข้อความแล้วได้คำตอบจาก Claude แบบ stream ทีละ token, เก็บประวัติลง Postgres,
reload หน้าแล้วเห็น conversation เดิม. UI ใช้ AI Elements (ไม่ generic).

**สำเร็จเมื่อ:** พิมข้อความ → เห็นคำตอบ stream เข้ามา → reload → conversation เก่ายังอยู่.

## Non-goals (ตัดออกชัดเจน)

- RAG / retrieval
- worker / Asynq queue
- auth / users / login (single-user, conversation ไม่ผูก user_id)
- streaming resume หลัง connection drop
- UI polish เกิน default ของ AI Elements
- conversation title generation อัตโนมัติ (ใช้ค่า default ไปก่อน)

## Stack (pinned)

- **backend** (`apps/backend`, Go): chi v5, pgx/v5, **sqlc**, **golang-migrate**, slog, `github.com/anthropics/anthropic-sdk-go`
- **frontend** (`apps/frontend`, Next.js): server-first, Tailwind v4, shadcn AI Elements, AI SDK v5 (ดู skill `frontend-stack`)
- **contracts** (`packages/contracts`): shared message/conversation types
- **model:** `claude-opus-4-8` ผ่าน `ANTHROPIC_API_KEY` (subscription ≠ API key — ต้องใช้ API key แยก)

## Architecture

```
Browser (Next.js / AI Elements)
  │  POST /api/conversations              → สร้าง conversation
  │  GET  /api/conversations/:id          → โหลด history (render ตอน reload)
  │  POST /api/conversations/:id/messages → ส่งข้อความ, ตอบกลับเป็น SSE stream
  ▼
Backend (Go, chi)  apps/backend
  1. persist user message ลง DB
  2. โหลด full history ของ conversation นั้น
  3. เรียก Claude /v1/messages (stream=true, claude-opus-4-8) ส่ง history ทั้งหมด
  4. relay token delta → browser เป็น SSE chunk
  5. stream จบ → persist assistant message
  ▼
Postgres (sqlc + golang-migrate)
```

**ทำไม persist ก่อน stream:** Claude API เป็น stateless — ทุก turn ต้องส่ง history ครบ.
นั่นคือเหตุผลที่ message ต้องอยู่ใน DB ไม่ใช่แค่ใน memory ฝั่ง client.

## Data model (migrations/)

```sql
-- 0001_create_conversations.sql
CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'New chat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 0002_create_messages.sql
CREATE TYPE message_role AS ENUM ('user', 'assistant');

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            message_role NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
```

หมายเหตุ: ต้องเปิด `pgcrypto` (`gen_random_uuid()`) ใน migration 0000 เหมือน pattern เดิม.

## Contracts (packages/contracts/)

shared shape ที่ frontend + backend ใช้ตัวเดียวกัน (camelCase บน wire):

```
Role = "user" | "assistant"

Conversation { id: string, title: string, createdAt: string }
Message      { id: string, conversationId: string, role: Role, content: string, createdAt: string }

# SSE chunk จาก POST /messages
ChatChunk =
  | { type: "delta", text: string }
  | { type: "done",  message: Message }   # assistant message ที่ persist แล้ว
  | { type: "error", message: string }
```

⚠️ แตะ `packages/contracts/**` ต้องผ่าน `contract-guardian` review.

## API surface (backend)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/conversations` | — | 201 `Conversation` |
| GET | `/api/conversations` | — | 200 `Conversation[]` (เรียง created_at desc) |
| GET | `/api/conversations/:id` | — | 200 `{ conversation, messages }` |
| POST | `/api/conversations/:id/messages` | `{ content }` | 200 `text/event-stream` ของ `ChatChunk` |

- validation ที่ handler: `content` ไม่ว่าง, ยาว ≤ ~10k chars.
- 404 ถ้า conversation id ไม่มี.

## Streaming detail

- backend ใช้ `client.Messages.NewStreaming(...)` model `claude-opus-4-8`, `max_tokens` 16000.
- สะสม `TextDelta` แล้ว flush เป็น SSE `{type:"delta"}` ทีละ chunk (flush + `Content-Type: text/event-stream`).
- frontend อ่าน SSE ด้วย AI Elements / AI SDK v5 streaming primitives, append token เข้า bubble.

## Error handling

| กรณี | พฤติกรรม |
|---|---|
| Claude API error / refusal | emit `{type:"error"}` chunk, **ไม่ persist** assistant turn, frontend โชว์ inline error |
| stream drop กลางคัน | assistant message **ไม่ persist** (กันเก็บคำตอบครึ่ง ๆ), user resend ได้ |
| conversation id ไม่มี | 404 ก่อนเริ่ม stream |
| `content` ว่าง/ยาวเกิน | 400 ที่ handler |

- **ห้าม log PII** (เนื้อ message, token) — log แค่ conversation id, จำนวน token. มี hook block อยู่แล้ว.
- error mapping ตาม skill `golang-error-handling` (sentinel + `%w`).

## House style (apps/backend/CLAUDE.md)

- package-per-domain: `internal/chat/` (ไม่ใช่ตาม technical layer)
- routes แยกจาก handlers (`routes.go` ↔ `handlers.go`)
- service ↔ sqlc repo ↔ handler แยกชั้น; ไม่ return sqlc struct ออก handler — ใช้ DTO จาก contracts
- conversation/message HTTP schema import จาก `packages/contracts/`

## Open questions (ตัดสินตอน implement plan)

1. SSE vs WebSocket — เริ่มด้วย **SSE** (ง่ายกว่า, พอสำหรับ one-way token stream); backend CLAUDE.md เปิดทาง WebSocket ไว้แต่ slice นี้ไม่ต้อง.
2. `title` — slice นี้ fix `'New chat'`; generation ไว้รอบหน้า.

## Build order (จะ refine ใน implementation plan)

1. `packages/contracts` — message/conversation/chunk types (รากที่ทั้งสองฝั่งพึ่ง)
2. backend: migrations → sqlc queries → chat service (persist + Claude stream) → handlers/routes
3. frontend: conversation list → chat view (AI Elements) → ต่อ SSE
4. verify end-to-end ด้วย curl (backend) แล้ว manual (UI)

> รายละเอียด task-by-task + ตัดสินว่า task ไหน scope ชัดพอจะโยน async / task ไหน pair → อยู่ใน implementation plan (ขั้นถัดไป).
