package chat

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
)

// claudeStreamer ครอบเฉพาะสิ่งที่ chat service ใช้ ให้ mock ใน test ได้.
type claudeStreamer interface {
	// Stream ส่ง history ทั้งหมดไป Claude, เรียก onDelta ทุก token, คืน assistant text เต็ม.
	Stream(ctx context.Context, history []Message, onDelta func(string)) (string, error)
}

// AnthropicStreamer เรียก Claude /v1/messages แบบ streaming (claude-opus-4-8).
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
		if err := msg.Accumulate(event); err != nil {
			return "", fmt.Errorf("anthropic accumulate: %w", err)
		}
		if delta, ok := event.AsAny().(anthropic.ContentBlockDeltaEvent); ok {
			if td, ok := delta.Delta.AsAny().(anthropic.TextDelta); ok {
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
