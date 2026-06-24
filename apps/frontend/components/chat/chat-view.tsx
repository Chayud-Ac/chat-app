"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { AlignLeft, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import type { Attachment } from "@/lib/mocks";
import { getConversation, streamMessage } from "@/lib/api";
import { conversationsKey } from "@/lib/queries";
import {
  MOCK_ATTACHMENTS,
  MOCK_MODELS,
  MOCK_SUGGESTED_PROMPTS,
  MOCK_USER,
} from "@/lib/mocks";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputBody,
  PromptInputButton,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { AttachmentChip } from "@/components/chat/attachment-chip";
import { ConversationTopbar } from "@/components/layout/conversation-topbar";
import { MarginaliaEmptyState } from "@/components/chat/empty-state";
import { MessageError } from "@/components/chat/message-error";
import { StreamingCaret } from "@/components/chat/streaming-caret";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";

// The in-flight turn: the user's just-sent message + the streaming assistant text.
type StreamingTurn = {
  userContent: string;
  assistantText: string;
};

export function ChatView({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });

  const [turn, setTurn] = useState<StreamingTurn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [modelId, setModelId] = useState(MOCK_MODELS[0].id);
  // Mock attachments (no upload backend yet) — seeded so the "with attachment"
  // composer state is visible; the paperclip re-adds the sample.
  const [attachments, setAttachments] = useState<Attachment[]>(MOCK_ATTACHMENTS);
  // Remember the last user message so an error can be retried.
  const lastSent = useRef<string | null>(null);

  const messages = data?.messages ?? [];
  const isStreaming = turn !== null;
  const title = data?.conversation.title ?? "New conversation";

  const send = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;

    lastSent.current = trimmed;
    setError(null);
    setTurn({ userContent: trimmed, assistantText: "" });

    try {
      await streamMessage(conversationId, trimmed, (chunk) => {
        if (chunk.type === "delta") {
          setTurn((prev) =>
            prev ? { ...prev, assistantText: prev.assistantText + chunk.text } : prev
          );
        } else if (chunk.type === "error") {
          setError(chunk.message);
          setTurn(null); // assistant turn not persisted by backend
        }
        // "done" → both messages are now persisted; refetch handles render below.
      });
      // Stream finished: pull persisted history (user + assistant) and refresh list.
      await queryClient.invalidateQueries({
        queryKey: ["conversation", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: conversationsKey });
    } catch {
      setError("Failed to send message");
    } finally {
      setTurn(null);
    }
  };

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text ?? "";
    if (!text.trim() || isStreaming) return;
    setDraft(""); // controlled textarea: form.reset() can't clear React state
    void send(text);
  };

  const handleRetry = () => {
    if (lastSent.current) void send(lastSent.current);
  };

  const isEmpty = !isLoading && !isError && messages.length === 0 && !turn;
  // Before the first delta arrives, show the thinking indicator instead of an empty bubble.
  const isThinking = turn !== null && turn.assistantText.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col">
      {!isEmpty && (
        <ConversationTopbar
          title={title}
          models={MOCK_MODELS}
          modelId={modelId}
          onModelChange={setModelId}
        />
      )}

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-2xl">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {isError && (
            <p className="text-sm text-destructive">
              Failed to load conversation
            </p>
          )}
          {isEmpty && (
            <MarginaliaEmptyState
              user={MOCK_USER}
              prompts={MOCK_SUGGESTED_PROMPTS}
              greeting="Good evening"
              onPickPrompt={setDraft}
            />
          )}
          {messages.map((m) => (
            <Message from={m.role} key={m.id}>
              <MessageContent>
                <MessageResponse>{m.content}</MessageResponse>
              </MessageContent>
            </Message>
          ))}
          {turn && (
            <>
              <Message from="user">
                <MessageContent>
                  <MessageResponse>{turn.userContent}</MessageResponse>
                </MessageContent>
              </Message>
              <Message from="assistant">
                <MessageContent>
                  {isThinking ? (
                    <ThinkingIndicator label="Reading your draft…" />
                  ) : (
                    <StreamingCaret>
                      <MessageResponse>{turn.assistantText}</MessageResponse>
                    </StreamingCaret>
                  )}
                </MessageContent>
              </Message>
            </>
          )}
          {error && (
            <MessageError
              message={error}
              onRetry={handleRetry}
              onDismiss={() => setError(null)}
            />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-card p-4">
        <PromptInput onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <PromptInputBody>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {attachments.map((att) => (
                  <AttachmentChip
                    key={att.id}
                    attachment={att}
                    onRemove={(id) =>
                      setAttachments((prev) => prev.filter((a) => a.id !== id))
                    }
                  />
                ))}
              </div>
            )}
            <PromptInputTextarea
              placeholder="Reply to Marginalia…"
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputButton
                aria-label="Attach a file"
                onClick={() => setAttachments(MOCK_ATTACHMENTS)}
              >
                <Paperclip className="size-4" />
              </PromptInputButton>
              <PromptInputButton aria-label="Formatting">
                <AlignLeft className="size-4" />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit status={isStreaming ? "streaming" : "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
