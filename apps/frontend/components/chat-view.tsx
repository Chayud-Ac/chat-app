"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { getConversation } from "@/lib/api";
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

export function ChatView({ conversationId }: { conversationId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => getConversation(conversationId),
  });

  const messages = data?.messages ?? [];

  const handleSubmit = (_message: PromptInputMessage) => {
    // Sending + SSE streaming is wired in Task 15.
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
          {!isLoading && !isError && messages.length === 0 && (
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <PromptInputBody>
            <PromptInputTextarea placeholder="Say something…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit status="ready" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
