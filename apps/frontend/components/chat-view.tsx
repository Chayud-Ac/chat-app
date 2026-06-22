"use client";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { getConversation, streamMessage } from "@/lib/api";
import { conversationsKey } from "@/components/sidebar";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
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
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

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

  const messages = data?.messages ?? [];
  const isStreaming = turn !== null;

  const handleSubmit = async (message: PromptInputMessage) => {
    const content = message.text?.trim();
    if (!content || isStreaming) return;

    setError(null);
    setTurn({ userContent: content, assistantText: "" });

    try {
      await streamMessage(conversationId, content, (chunk) => {
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

  return (
    <div className="flex h-full flex-1 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {isError && (
            <p className="text-sm text-destructive">
              Failed to load conversation
            </p>
          )}
          {!isLoading && !isError && messages.length === 0 && !turn && (
            <ConversationEmptyState
              icon={<MessageSquare className="size-12" />}
              title="Start a conversation"
              description="Type a message below to begin chatting"
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
                  <MessageResponse>{turn.assistantText}</MessageResponse>
                </MessageContent>
              </Message>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <PromptInputBody>
            <PromptInputTextarea placeholder="Say something…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit
              status={isStreaming ? "streaming" : "ready"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
