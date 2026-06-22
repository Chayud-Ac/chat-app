package chat

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	repo "github.com/Chayud-Ac/chat-app/apps/backend/internal/adapters/postgresql/sqlc"
)

// fakeRepo เป็น in-memory implement ของ repo.Querier สำหรับ unit test.
type fakeRepo struct {
	convs map[uuid.UUID]repo.Conversation
	msgs  []repo.Message
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{convs: map[uuid.UUID]repo.Conversation{}}
}

func (f *fakeRepo) CreateConversation(_ context.Context) (repo.Conversation, error) {
	id := uuid.New()
	c := repo.Conversation{
		ID:        pgtype.UUID{Bytes: id, Valid: true},
		Title:     "New chat",
		CreatedAt: pgtype.Timestamptz{Valid: true},
	}
	f.convs[id] = c
	return c, nil
}

func (f *fakeRepo) ListConversations(_ context.Context) ([]repo.Conversation, error) {
	out := make([]repo.Conversation, 0, len(f.convs))
	for _, c := range f.convs {
		out = append(out, c)
	}
	return out, nil
}

func (f *fakeRepo) GetConversation(_ context.Context, id pgtype.UUID) (repo.Conversation, error) {
	c, ok := f.convs[uuid.UUID(id.Bytes)]
	if !ok {
		return repo.Conversation{}, pgx.ErrNoRows
	}
	return c, nil
}

func (f *fakeRepo) CreateMessage(_ context.Context, arg repo.CreateMessageParams) (repo.Message, error) {
	m := repo.Message{
		ID:             pgtype.UUID{Bytes: uuid.New(), Valid: true},
		ConversationID: arg.ConversationID,
		Role:           arg.Role,
		Content:        arg.Content,
		CreatedAt:      pgtype.Timestamptz{Valid: true},
	}
	f.msgs = append(f.msgs, m)
	return m, nil
}

func (f *fakeRepo) ListMessages(_ context.Context, convID pgtype.UUID) ([]repo.Message, error) {
	out := make([]repo.Message, 0)
	for _, m := range f.msgs {
		if m.ConversationID.Bytes == convID.Bytes {
			out = append(out, m)
		}
	}
	return out, nil
}

// fakeStreamer echo "pong" ทีละ token สำหรับ test.
type fakeStreamer struct{}

func (fakeStreamer) Stream(_ context.Context, _ []Message, onDelta func(string)) (string, error) {
	onDelta("po")
	onDelta("ng")
	return "pong", nil
}

func TestService_SendMessage_StreamsAndPersists(t *testing.T) {
	svc := NewService(newFakeRepo(), fakeStreamer{})
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
	msgs, _ := svc.loadHistory(context.Background(), conv.ID)
	if len(msgs) != 2 {
		t.Fatalf("history len = %d, want 2 (user + assistant)", len(msgs))
	}
}

func TestService_SendMessage_ConversationNotFound(t *testing.T) {
	svc := NewService(newFakeRepo(), fakeStreamer{})
	_, err := svc.SendMessage(context.Background(), uuid.New(), "hi", func(string) {})
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("err = %v, want ErrConversationNotFound", err)
	}
}

func TestService_CreateConversation(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	conv, err := svc.CreateConversation(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if conv.Title != "New chat" {
		t.Fatalf("title = %q, want New chat", conv.Title)
	}
	if conv.ID == uuid.Nil {
		t.Fatal("conv ID is nil")
	}
}

func TestService_GetConversation_NotFound(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	_, err := svc.GetConversation(context.Background(), uuid.New())
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("err = %v, want ErrConversationNotFound", err)
	}
}

func TestService_ListConversations(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	if _, err := svc.CreateConversation(context.Background()); err != nil {
		t.Fatal(err)
	}
	list, err := svc.ListConversations(context.Background())
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d, want 1", len(list))
	}
}

func TestService_persistUserMessage_EmptyContent(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	conv, _ := svc.CreateConversation(context.Background())
	_, err := svc.persistUserMessage(context.Background(), conv.ID, "")
	if !errors.Is(err, ErrEmptyContent) {
		t.Fatalf("err = %v, want ErrEmptyContent", err)
	}
}

func TestService_persistUserMessage_OK(t *testing.T) {
	svc := NewService(newFakeRepo(), nil)
	conv, _ := svc.CreateConversation(context.Background())
	msg, err := svc.persistUserMessage(context.Background(), conv.ID, "hello")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if msg.Role != "user" || msg.Content != "hello" {
		t.Fatalf("got role=%s content=%q", msg.Role, msg.Content)
	}
	hist, _ := svc.loadHistory(context.Background(), conv.ID)
	if len(hist) != 1 {
		t.Fatalf("history len = %d, want 1", len(hist))
	}
}
