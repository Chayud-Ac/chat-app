# Chat Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ส่งข้อความ → persist → stream คำตอบจาก Claude → render; reload เห็น conversation เก่า.

**Architecture:** chi handler → chat service → sqlc repo (pgxpool) → Postgres. Backend stream คำตอบจาก Claude (`claude-opus-4-8`) แล้ว relay เป็น SSE ให้ browser. Next.js + AI Elements ฝั่ง UI. Shared types ใน `packages/contracts`.

**Tech Stack:** Go 1.23, chi v5, pgx/v5 + pgxpool, sqlc, golang-migrate, `github.com/anthropics/anthropic-sdk-go`, slog · Next.js + Tailwind v4 + AI Elements + AI SDK v5.

**Spec:** `docs/superpowers/specs/2026-06-22-chat-vertical-slice-design.md`

---

## File Structure (locked in)

```
packages/contracts/
  chat.ts                     # Role, Conversation, Message, ChatChunk (TS source of truth)

apps/backend/
  sqlc.yaml                   # NEW
  migrations/
    0000_init.sql             # pgcrypto
    0001_create_conversations.sql
    0002_create_messages.sql
  internal/
    platform/
      pgx.go                  # NEW — pgxpool.New + ping (แยกจาก db.go probe เดิม)
    adapters/postgresql/
      queries/chat.sql        # sqlc queries
      sqlc/                   # generated (package repo)
    chat/
      types.go                # DTOs ตรงกับ contracts
      service.go              # persist + load history + Claude stream
      handlers.go             # chi handlers
      routes.go               # route wiring
      service_test.go
      handlers_test.go
  cmd/server/main.go          # MODIFY — wire pgxpool + chat routes (chi)

apps/frontend/                # scaffold ใน Phase 4
```

**Convention (apps/backend/CLAUDE.md):** package-per-domain (`internal/chat/`), routes แยกจาก handlers, ไม่ return sqlc struct ออก handler, error ตาม `golang-error-handling` (sentinel + `%w`). ห้าม log PII.

---

## PHASE 0 — Contracts (รากที่ทั้งสองฝั่งพึ่ง)

### Task 0: Shared chat contracts

**Files:**
- Create: `packages/contracts/chat.ts`

- [ ] **Step 1: เขียน contract types**

```typescript
// packages/contracts/chat.ts
export type Role = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string;
}

export type ChatChunk =
  | { type: "delta"; text: string }
  | { type: "done"; message: Message }
  | { type: "error"; message: string };
```

- [ ] **Step 2: Commit**

```bash
git add packages/contracts/chat.ts
git commit -m "feat(contracts): add chat conversation/message/chunk types"
```

> ⚠️ แตะ `packages/contracts/**` → PR ต้องผ่าน `contract-guardian` review.

---

## PHASE 1 — DB foundation (migrations + sqlc + pgxpool)

### Task 1: Dependencies + sqlc config

**Files:**
- Modify: `apps/backend/go.mod`
- Create: `apps/backend/sqlc.yaml`

- [ ] **Step 1: เพิ่ม dependencies**

Run (ใน `apps/backend/`):
```bash
go get github.com/go-chi/chi/v5
go get github.com/jackc/pgx/v5
go get github.com/jackc/pgx/v5/pgxpool
go get github.com/anthropics/anthropic-sdk-go
go get github.com/google/uuid
```

- [ ] **Step 2: เขียน sqlc.yaml**

```yaml
version: "2"
sql:
  - engine: "postgresql"
    queries: "./internal/adapters/postgresql/queries"
    schema: "./migrations"
    gen:
      go:
        package: "repo"
        out: "./internal/adapters/postgresql/sqlc"
        sql_package: "pgx/v5"
        emit_interface: true
        emit_empty_slices: true
        emit_pointers_for_null_types: true
        emit_json_tags: false
```

- [ ] **Step 3: สร้าง dir + ติดตั้ง sqlc**

```bash
mkdir -p internal/adapters/postgresql/queries internal/adapters/postgresql/sqlc migrations
# sqlc: brew install sqlc  หรือ  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
```

- [ ] **Step 4: ยืนยัน sqlc compile (ยังไม่มี query — warn ได้)**

Run: `sqlc compile`
Expected: exit 0 (อาจ warn ว่า no queries)

- [ ] **Step 5: Commit**

```bash
git add apps/backend/go.mod apps/backend/go.sum apps/backend/sqlc.yaml
git commit -m "chore(backend): add chi, pgx, anthropic deps + sqlc config"
```

---

### Task 2: Migrations

**Files:**
- Create: `apps/backend/migrations/0000_init.sql`
- Create: `apps/backend/migrations/0001_create_conversations.sql`
- Create: `apps/backend/migrations/0002_create_messages.sql`

- [ ] **Step 1: เขียน migrations (golang-migrate up/down คู่)**

`0000_init.up.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
`0000_init.down.sql`:
```sql
DROP EXTENSION IF EXISTS pgcrypto;
```

`0001_create_conversations.up.sql`:
```sql
CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL DEFAULT 'New chat',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
`0001_create_conversations.down.sql`:
```sql
DROP TABLE conversations;
```

`0002_create_messages.up.sql`:
```sql
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
`0002_create_messages.down.sql`:
```sql
DROP TABLE messages;
DROP TYPE message_role;
```

- [ ] **Step 2: รัน migrate up บน local DB**

Run: `migrate -path migrations -database "$DATABASE_URL" up`
Expected: 3 migrations applied, no error

- [ ] **Step 3: ยืนยันใน psql**

Run: `psql "$DATABASE_URL" -c '\d messages'`
Expected: ตาราง messages มี column ครบ + FK ไป conversations

- [ ] **Step 4: Commit**

```bash
git add apps/backend/migrations
git commit -m "feat(chat): add conversations + messages migrations"
```

---

### Task 3: sqlc queries

**Files:**
- Create: `apps/backend/internal/adapters/postgresql/queries/chat.sql`

- [ ] **Step 1: เขียน queries**

```sql
-- name: CreateConversation :one
INSERT INTO conversations DEFAULT VALUES
RETURNING id, title, created_at;

-- name: ListConversations :many
SELECT id, title, created_at FROM conversations
ORDER BY created_at DESC;

-- name: GetConversation :one
SELECT id, title, created_at FROM conversations
WHERE id = $1;

-- name: CreateMessage :one
INSERT INTO messages (conversation_id, role, content)
VALUES ($1, $2, $3)
RETURNING id, conversation_id, role, content, created_at;

-- name: ListMessages :many
SELECT id, conversation_id, role, content, created_at FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC;
```

- [ ] **Step 2: generate**

Run: `sqlc generate`
Expected: ไฟล์ใน `internal/adapters/postgresql/sqlc/` (package `repo`), มี `Querier` interface

- [ ] **Step 3: ยืนยัน build**

Run: `go build ./...`
Expected: ไม่มี compile error

- [ ] **Step 4: Commit**

```bash
git add apps/backend/internal/adapters/postgresql
git commit -m "feat(chat): add sqlc queries for conversations + messages"
```

---

### Task 4: pgxpool wrapper

**Files:**
- Create: `apps/backend/internal/platform/pgx.go`

- [ ] **Step 1: เขียน wrapper**

```go
package platform

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool สร้าง pgxpool จาก DATABASE_URL แล้ว ping ให้แน่ใจว่าต่อได้.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("pgxpool.New: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pgxpool ping: %w", err)
	}
	return pool, nil
}
```

- [ ] **Step 2: build**

Run: `go build ./...`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add apps/backend/internal/platform/pgx.go
git commit -m "feat(platform): add pgxpool wrapper for chat queries"
```

---

## PHASE 2 — Chat service (persist + Claude stream)

### Task 5: DTO types + toDTO

**Files:**
- Create: `apps/backend/internal/chat/types.go`

- [ ] **Step 1: เขียน DTO + sentinel errors**

```go
package chat

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrConversationNotFound = errors.New("conversation not found")
	ErrEmptyContent         = errors.New("content is empty")
)

type Conversation struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}

type Message struct {
	ID             uuid.UUID `json:"id"`
	ConversationID uuid.UUID `json:"conversationId"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}
```

- [ ] **Step 2: build**

Run: `go build ./internal/chat/...`
Expected: pass (ยังไม่มี service — แค่ types)

- [ ] **Step 3: Commit**

```bash
git add apps/backend/internal/chat/types.go
git commit -m "feat(chat): add chat DTO types + sentinel errors"
```

---

### Task 6: Service — create/list/get (no streaming yet, TDD)

**Files:**
- Create: `apps/backend/internal/chat/service.go`
- Create: `apps/backend/internal/chat/service_test.go`

> ใช้ fake `repo.Querier` (in-memory) สำหรับ unit test — ไม่ต่อ DB จริงใน unit test ส่วนนี้.

- [ ] **Step 1: เขียน failing test (CreateConversation + GetConversation not found)**

```go
package chat

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
)

func TestService_CreateConversation(t *testing.T) {
	svc := NewService(newFakeRepo(), nil) // claude client = nil; create ไม่เรียก claude
	conv, err := svc.CreateConversation(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if conv.Title != "New chat" {
		t.Fatalf("title = %q, want New chat", conv.Title)
	}
}

func TestService_GetConversation_NotFound(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	_, err := svc.GetConversation(context.Background(), uuid.New())
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("err = %v, want ErrConversationNotFound", err)
	}
}
```

ในไฟล์เดียวกัน เขียน `newFakeRepo()` ที่ implement `repo.Querier` แบบ in-memory (map เก็บ conversations/messages; method ที่ไม่ใช้ใน test คืน zero/nil ได้).

- [ ] **Step 2: รัน test ให้ fail**

Run: `go test ./internal/chat/ -run TestService_Create -v`
Expected: FAIL (NewService/CreateConversation ยังไม่มี)

- [ ] **Step 3: เขียน service (create/list/get + toDTO)**

```go
package chat

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	repo "github.com/Chayud-Ac/chat-app/apps/backend/internal/adapters/postgresql/sqlc"
)

// claudeStreamer = interface แคบ ๆ ของ anthropic client (ให้ test mock ได้). นิยามใน stream.go (Task 8).
type Service struct {
	repo   repo.Querier
	claude claudeStreamer
}

func NewService(r repo.Querier, c claudeStreamer) *Service {
	return &Service{repo: r, claude: c}
}

func (s *Service) CreateConversation(ctx context.Context) (Conversation, error) {
	row, err := s.repo.CreateConversation(ctx)
	if err != nil {
		return Conversation{}, fmt.Errorf("chat.CreateConversation: %w", err)
	}
	return convToDTO(row), nil
}

func (s *Service) ListConversations(ctx context.Context) ([]Conversation, error) {
	rows, err := s.repo.ListConversations(ctx)
	if err != nil {
		return nil, fmt.Errorf("chat.ListConversations: %w", err)
	}
	out := make([]Conversation, 0, len(rows))
	for _, r := range rows {
		out = append(out, convToDTO(r))
	}
	return out, nil
}

func (s *Service) GetConversation(ctx context.Context, id uuid.UUID) (Conversation, error) {
	row, err := s.repo.GetConversation(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Conversation{}, ErrConversationNotFound
	}
	if err != nil {
		return Conversation{}, fmt.Errorf("chat.GetConversation: %w", err)
	}
	return convToDTO(row), nil
}
```

เพิ่ม `convToDTO` / `msgToDTO` helper (แปลง `repo.Conversation` / `repo.Message` → DTO). ปรับชื่อ field ให้ตรงกับที่ sqlc gen จริง (ดูจาก Task 3 output).

- [ ] **Step 4: รัน test ให้ pass**

Run: `go test ./internal/chat/ -run TestService -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/internal/chat/service.go apps/backend/internal/chat/service_test.go
git commit -m "feat(chat): add service create/list/get conversations"
```

---

### Task 7: Service — SendMessage (persist user + load history), stream แยก Task 8

**Files:**
- Modify: `apps/backend/internal/chat/service.go`
- Modify: `apps/backend/internal/chat/service_test.go`

- [ ] **Step 1: failing test — SendMessage persist user message + reject empty**

```go
func TestService_SendMessage_EmptyContent(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	conv, _ := svc.CreateConversation(context.Background())
	_, err := svc.persistUserMessage(context.Background(), conv.ID, "")
	if !errors.Is(err, ErrEmptyContent) {
		t.Fatalf("err = %v, want ErrEmptyContent", err)
	}
}

func TestService_persistUserMessage_OK(t *testing.T) {
	fake := newFakeRepo()
	svc := NewService(fake, nil)
	conv, _ := svc.CreateConversation(context.Background())
	msg, err := svc.persistUserMessage(context.Background(), conv.ID, "hello")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if msg.Role != "user" || msg.Content != "hello" {
		t.Fatalf("got role=%s content=%q", msg.Role, msg.Content)
	}
}
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `go test ./internal/chat/ -run TestService_persistUserMessage -v`
Expected: FAIL (persistUserMessage ยังไม่มี)

- [ ] **Step 3: เขียน persistUserMessage + loadHistory**

```go
func (s *Service) persistUserMessage(ctx context.Context, convID uuid.UUID, content string) (Message, error) {
	if content == "" {
		return Message{}, ErrEmptyContent
	}
	row, err := s.repo.CreateMessage(ctx, repo.CreateMessageParams{
		ConversationID: convID,
		Role:           repo.MessageRoleUser,
		Content:        content,
	})
	if err != nil {
		return Message{}, fmt.Errorf("chat.persistUserMessage: %w", err)
	}
	return msgToDTO(row), nil
}

func (s *Service) loadHistory(ctx context.Context, convID uuid.UUID) ([]Message, error) {
	rows, err := s.repo.ListMessages(ctx, convID)
	if err != nil {
		return nil, fmt.Errorf("chat.loadHistory: %w", err)
	}
	out := make([]Message, 0, len(rows))
	for _, r := range rows {
		out = append(out, msgToDTO(r))
	}
	return out, nil
}
```

> ปรับ `repo.MessageRoleUser` / param struct ให้ตรงกับ sqlc enum ที่ gen จริง (Task 3). ถ้า sqlc gen role เป็น string ธรรมดา ให้ใช้ `"user"`.

- [ ] **Step 4: รัน test ให้ pass**

Run: `go test ./internal/chat/ -run TestService -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/internal/chat/service.go apps/backend/internal/chat/service_test.go
git commit -m "feat(chat): add persist user message + load history"
```

---

### Task 8: Claude streaming + SendMessage orchestration

**Files:**
- Create: `apps/backend/internal/chat/stream.go`
- Modify: `apps/backend/internal/chat/service.go`
- Modify: `apps/backend/internal/chat/service_test.go`

> `SendMessage` รับ callback `onDelta func(string)` แล้วคืน assistant `Message` ที่ persist แล้ว. การ stream จริงไป browser เป็นงานของ handler (Task 10) ที่ผ่าน onDelta มา flush SSE.

- [ ] **Step 1: นิยาม interface + failing test ด้วย fake streamer**

```go
// stream.go
package chat

import (
	"context"

	"github.com/anthropics/anthropic-sdk-go"
)

// claudeStreamer ครอบเฉพาะสิ่งที่เราใช้ ให้ mock ใน test ได้.
type claudeStreamer interface {
	// Stream ส่ง history ทั้งหมด, เรียก onDelta ทุก token, คืน assistant text เต็ม.
	Stream(ctx context.Context, history []Message, onDelta func(string)) (string, error)
}
```

test (service_test.go) — fake streamer ที่ echo "pong" ทีละ token:
```go
type fakeStreamer struct{}

func (fakeStreamer) Stream(_ context.Context, _ []Message, onDelta func(string)) (string, error) {
	onDelta("po")
	onDelta("ng")
	return "pong", nil
}

func TestService_SendMessage_StreamsAndPersists(t *testing.T) {
	fake := newFakeRepo()
	svc := NewService(fake, fakeStreamer{})
	conv, _ := svc.CreateConversation(context.Background())

	var got string
	asst, err := svc.SendMessage(context.Background(), conv.ID, "hi", func(d string) { got += d })
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if got != "pong" {
		t.Fatalf("streamed = %q, want pong", got)
	}
	if asst.Role != "assistant" || asst.Content != "pong" {
		t.Fatalf("assistant msg wrong: %+v", asst)
	}
	// history ต้องมี 2 ข้อความ: user + assistant
	msgs, _ := svc.loadHistory(context.Background(), conv.ID)
	if len(msgs) != 2 {
		t.Fatalf("history len = %d, want 2", len(msgs))
	}
}
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `go test ./internal/chat/ -run TestService_SendMessage_Streams -v`
Expected: FAIL (SendMessage ยังไม่มี)

- [ ] **Step 3: เขียน SendMessage**

```go
// service.go
func (s *Service) SendMessage(ctx context.Context, convID uuid.UUID, content string, onDelta func(string)) (Message, error) {
	if _, err := s.GetConversation(ctx, convID); err != nil {
		return Message{}, err // ErrConversationNotFound ส่งต่อ
	}
	if _, err := s.persistUserMessage(ctx, convID, content); err != nil {
		return Message{}, err
	}
	history, err := s.loadHistory(ctx, convID)
	if err != nil {
		return Message{}, err
	}
	full, err := s.claude.Stream(ctx, history, onDelta)
	if err != nil {
		return Message{}, fmt.Errorf("chat.SendMessage stream: %w", err)
	}
	// persist assistant message หลัง stream จบ (ถ้า stream error ด้านบน return ก่อน — ไม่ persist ครึ่ง ๆ)
	row, err := s.repo.CreateMessage(ctx, repo.CreateMessageParams{
		ConversationID: convID,
		Role:           repo.MessageRoleAssistant,
		Content:        full,
	})
	if err != nil {
		return Message{}, fmt.Errorf("chat.SendMessage persist assistant: %w", err)
	}
	return msgToDTO(row), nil
}
```

- [ ] **Step 4: รัน test ให้ pass**

Run: `go test ./internal/chat/ -v`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add apps/backend/internal/chat/stream.go apps/backend/internal/chat/service.go apps/backend/internal/chat/service_test.go
git commit -m "feat(chat): add SendMessage orchestration with streaming callback"
```

---

### Task 9: Real Claude streamer (anthropic-sdk-go)

**Files:**
- Modify: `apps/backend/internal/chat/stream.go`

> ใช้ `client.Messages.NewStreaming` ตาม claude-api reference (model `claude-opus-4-8`, max_tokens 16000). map `[]Message` → `[]anthropic.MessageParam`. ส่วนนี้ test กับ Claude จริงทำ unit test ไม่ได้ — verify ใน Task 12 (curl end-to-end).

- [ ] **Step 1: เขียน real streamer**

```go
type AnthropicStreamer struct {
	client anthropic.Client
}

func NewAnthropicStreamer(apiKey string) *AnthropicStreamer {
	return &AnthropicStreamer{
		client: anthropic.NewClient(option.WithAPIKey(apiKey)),
	}
}

func (a *AnthropicStreamer) Stream(ctx context.Context, history []Message, onDelta func(string)) (string, error) {
	msgs := make([]anthropic.MessageParam, 0, len(history))
	for _, m := range history {
		block := anthropic.NewTextBlock(m.Content)
		if m.Role == "assistant" {
			msgs = append(msgs, anthropic.NewAssistantMessage(block))
		} else {
			msgs = append(msgs, anthropic.NewUserMessage(block))
		}
	}
	stream := a.client.Messages.NewStreaming(ctx, anthropic.MessageNewParams{
		Model:     anthropic.ModelClaudeOpus4_8,
		MaxTokens: 16000,
		Messages:  msgs,
	})
	msg := anthropic.Message{}
	for stream.Next() {
		event := stream.Current()
		_ = msg.Accumulate(event)
		if d, ok := event.AsAny().(anthropic.ContentBlockDeltaEvent); ok {
			if td, ok := d.Delta.AsAny().(anthropic.TextDelta); ok {
				onDelta(td.Text)
			}
		}
	}
	if err := stream.Err(); err != nil {
		return "", fmt.Errorf("anthropic stream: %w", err)
	}
	var full string
	for _, b := range msg.Content {
		if t, ok := b.AsAny().(anthropic.TextBlock); ok {
			full += t.Text
		}
	}
	return full, nil
}
```

เพิ่ม import `option "github.com/anthropics/anthropic-sdk-go/option"`.

> ⚠️ ชื่อ type/method ของ SDK (`ContentBlockDeltaEvent`, `TextDelta`, `Accumulate`, `ModelClaudeOpus4_8`) ยึดตาม claude-api reference — ถ้า compile ไม่ผ่าน ให้ fix จาก compiler error (อย่าเดา).

- [ ] **Step 2: build**

Run: `go build ./...`
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add apps/backend/internal/chat/stream.go
git commit -m "feat(chat): add anthropic streaming client (claude-opus-4-8)"
```

---

## PHASE 3 — HTTP layer (chi handlers + SSE)

### Task 10: Handlers + routes

**Files:**
- Create: `apps/backend/internal/chat/handlers.go`
- Create: `apps/backend/internal/chat/routes.go`
- Create: `apps/backend/internal/chat/handlers_test.go`

- [ ] **Step 1: failing test — POST /api/conversations คืน 201**

```go
package chat

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestHandlers_CreateConversation(t *testing.T) {
	svc := NewService(newFakeRepo(), fakeStreamer{})
	r := chi.NewRouter()
	Register(r, NewHandlers(svc))

	req := httptest.NewRequest(http.MethodPost, "/api/conversations", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201", w.Code)
	}
}
```

- [ ] **Step 2: รัน test ให้ fail**

Run: `go test ./internal/chat/ -run TestHandlers -v`
Expected: FAIL (Register/NewHandlers ยังไม่มี)

- [ ] **Step 3: เขียน handlers + routes**

`handlers.go`: struct `Handlers{svc *Service}`, methods:
- `createConversation` → `svc.CreateConversation` → 201 JSON
- `listConversations` → 200 JSON array
- `getConversation` → parse `chi.URLParam(r,"id")` เป็น uuid → `svc.GetConversation` + `loadHistory` → 200 `{conversation, messages}`; `ErrConversationNotFound` → 404
- `sendMessage` → parse `{content}`; set `Content-Type: text/event-stream`; เรียก `svc.SendMessage(..., onDelta)` ที่ onDelta เขียน `data: {"type":"delta","text":...}\n\n` + `flusher.Flush()`; จบส่ง `{"type":"done","message":...}`; error ส่ง `{"type":"error","message":...}` แล้วไม่ persist (service จัดการ persist เอง). validation: content ว่าง/ยาวเกิน → 400.

`routes.go`:
```go
func Register(r chi.Router, h *Handlers) {
	r.Route("/api/conversations", func(r chi.Router) {
		r.Post("/", h.createConversation)
		r.Get("/", h.listConversations)
		r.Get("/{id}", h.getConversation)
		r.Post("/{id}/messages", h.sendMessage)
	})
}
```

ใช้ helper json read/write (เขียน inline หรือ `internal/platform/httpio` ถ้าต้องการ — แต่ YAGNI: inline พอสำหรับ slice นี้).

- [ ] **Step 4: รัน test ให้ pass**

Run: `go test ./internal/chat/ -v`
Expected: PASS ทั้งหมด

- [ ] **Step 5: Commit**

```bash
git add apps/backend/internal/chat/handlers.go apps/backend/internal/chat/routes.go apps/backend/internal/chat/handlers_test.go
git commit -m "feat(chat): add chi handlers + SSE streaming endpoint"
```

---

### Task 11: Wire into main.go

**Files:**
- Modify: `apps/backend/cmd/server/main.go`

- [ ] **Step 1: เปลี่ยน ServeMux → chi, เพิ่ม pgxpool + chat**

แก้ `main()`:
- เพิ่ม `ANTHROPIC_API_KEY` ใน config (platform/config.go) — เพิ่ม field + validate.
- สร้าง `ctx` ก่อน, `pool, err := platform.NewPool(ctx, cfg.DatabaseURL)` + `defer pool.Close()`.
- `r := chi.NewRouter()`; ย้าย health มา mount บน chi (`health.Register` ปรับรับ chi.Router หรือ wrap); `chat.Register(r, chat.NewHandlers(chat.NewService(repo.New(pool), chat.NewAnthropicStreamer(cfg.AnthropicAPIKey))))`.
- `srv.Handler = r`.

> `repo.New(pool)` — sqlc gen constructor รับ `DBTX` (pgxpool.Pool satisfies). ปรับตาม gen จริง.

- [ ] **Step 2: build + vet**

Run: `go build ./... && go vet ./...`
Expected: pass

- [ ] **Step 3: รัน test ทั้ง backend**

Run: `go test ./...`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/backend/cmd/server/main.go apps/backend/internal/platform/config.go apps/backend/internal/health
git commit -m "feat(backend): wire chi router, pgxpool, chat routes into main"
```

---

### Task 12: Backend end-to-end verify (curl)

**Files:** none (verification only)

- [ ] **Step 1: ตั้ง env + รัน**

```bash
export DATABASE_URL=postgres://... REDIS_ADDR=localhost:6379 ANTHROPIC_API_KEY=sk-ant-...
migrate -path migrations -database "$DATABASE_URL" up
go run ./cmd/server
```

- [ ] **Step 2: curl flow**

```bash
CID=$(curl -s -X POST localhost:8080/api/conversations | jq -r .id)
curl -N -X POST localhost:8080/api/conversations/$CID/messages \
  -H 'Content-Type: application/json' -d '{"content":"say hi in 3 words"}'
# expect: SSE chunks {"type":"delta",...} แล้วปิดด้วย {"type":"done",...}
curl -s localhost:8080/api/conversations/$CID | jq '.messages | length'
# expect: 2 (user + assistant)
```

- [ ] **Step 3: ยืนยัน reload-equivalent** — `GET /api/conversations/$CID` คืน user + assistant message ครบ. ผ่านแล้วไม่ต้อง commit (verification).

---

## PHASE 4 — Frontend (scaffold + AI Elements + SSE)

> ⚠️ frontend ยังว่าง (แค่ CLAUDE.md). Phase นี้ scaffold จากศูนย์ + UI test ยาก → **verify แบบ manual** ไม่ใช่ TDD. ใช้ skill `frontend-stack` (Next.js server-first, Tailwind v4, AI Elements, AI SDK v5).

### Task 13: Scaffold Next.js + AI Elements

**Files:** `apps/frontend/*` (scaffold)

- [ ] **Step 1:** scaffold Next.js (TypeScript, app router, Tailwind v4, pnpm) ใน `apps/frontend`. ติดตั้ง shadcn AI Elements + AI SDK v5 ตาม `frontend-stack`.
- [ ] **Step 2:** import message/conversation types จาก `packages/contracts/chat.ts`.
- [ ] **Step 3:** `pnpm build` ผ่าน. Commit: `chore(frontend): scaffold next.js + ai elements`.

### Task 14: Conversation list + chat view

**Files:** `apps/frontend/app/*`

- [ ] **Step 1:** หน้า list conversation (เรียก `GET /api/conversations`), ปุ่ม new chat (`POST /api/conversations`).
- [ ] **Step 2:** chat view: render history จาก `GET /api/conversations/:id`, ใช้ AI Elements message bubbles.
- [ ] **Step 3:** Commit: `feat(frontend): conversation list + chat view`.

### Task 15: SSE streaming wire-up

**Files:** `apps/frontend/app/*`

- [ ] **Step 1:** ส่งข้อความ → `POST /api/conversations/:id/messages`, อ่าน SSE `ChatChunk`, append `delta` เข้า assistant bubble ทีละ token, จบที่ `done`, โชว์ error ที่ `error`.
- [ ] **Step 2:** กัน XSS ตอน render markdown จาก LLM (ตาม CLAUDE.md).
- [ ] **Step 3:** Commit: `feat(frontend): stream assistant response via SSE`.

### Task 16: End-to-end manual verify

- [ ] รัน backend + `pnpm dev`. พิมข้อความ → เห็น token stream → reload → conversation เก่ายังอยู่. ✅ = slice เสร็จ.

---

## Notes for splitting into issues / async

- **Phase 0–3 (backend + contracts)** = TDD ได้จริง, scope ชัดต่อ task → เหมาะโยน `@claude` async ทีละ task (หรือกลุ่ม phase). async เห็น `anti-slop` + CI ต่อ service รัน `go test` บน PR เป็น safety net. **ข้อควรระวัง:** async ยังไม่มี superpowers/TDD discipline — review PR เองทุกครั้ง.
- **Phase 4 (frontend)** = scaffold + manual verify, design decision เยอะ (AI Elements layout) → **pair ดีกว่า** async.
- Task ที่แตะ `packages/contracts/**` (Task 0) → PR ต้องผ่าน `contract-guardian`.
