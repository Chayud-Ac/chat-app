package chat

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	repo "github.com/Chayud-Ac/chat-app/apps/backend/internal/adapters/postgresql/sqlc"
)

// Service ถือ repo (sqlc Querier) + claude streamer สำหรับ chat domain.
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
	row, err := s.repo.GetConversation(ctx, toPGUUID(id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Conversation{}, ErrConversationNotFound
	}
	if err != nil {
		return Conversation{}, fmt.Errorf("chat.GetConversation: %w", err)
	}
	return convToDTO(row), nil
}

// SendMessage: persist user message → load history → stream คำตอบจาก Claude (เรียก onDelta
// ทุก token) → persist assistant message. ถ้า stream error จะ return ก่อน persist assistant
// (ไม่เก็บคำตอบครึ่ง ๆ).
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
	row, err := s.repo.CreateMessage(ctx, repo.CreateMessageParams{
		ConversationID: toPGUUID(convID),
		Role:           repo.MessageRoleAssistant,
		Content:        full,
	})
	if err != nil {
		return Message{}, fmt.Errorf("chat.SendMessage persist assistant: %w", err)
	}
	return msgToDTO(row), nil
}

func (s *Service) persistUserMessage(ctx context.Context, convID uuid.UUID, content string) (Message, error) {
	if content == "" {
		return Message{}, ErrEmptyContent
	}
	row, err := s.repo.CreateMessage(ctx, repo.CreateMessageParams{
		ConversationID: toPGUUID(convID),
		Role:           repo.MessageRoleUser,
		Content:        content,
	})
	if err != nil {
		return Message{}, fmt.Errorf("chat.persistUserMessage: %w", err)
	}
	return msgToDTO(row), nil
}

func (s *Service) loadHistory(ctx context.Context, convID uuid.UUID) ([]Message, error) {
	rows, err := s.repo.ListMessages(ctx, toPGUUID(convID))
	if err != nil {
		return nil, fmt.Errorf("chat.loadHistory: %w", err)
	}
	out := make([]Message, 0, len(rows))
	for _, r := range rows {
		out = append(out, msgToDTO(r))
	}
	return out, nil
}

// --- conversions: sqlc pgtype <-> DTO ---

func convToDTO(r repo.Conversation) Conversation {
	return Conversation{
		ID:        uuid.UUID(r.ID.Bytes),
		Title:     r.Title,
		CreatedAt: r.CreatedAt.Time,
	}
}

func msgToDTO(r repo.Message) Message {
	return Message{
		ID:             uuid.UUID(r.ID.Bytes),
		ConversationID: uuid.UUID(r.ConversationID.Bytes),
		Role:           string(r.Role),
		Content:        r.Content,
		CreatedAt:      r.CreatedAt.Time,
	}
}

func toPGUUID(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}
