"use client";

import { useState } from "react";
import { AlignLeft, Paperclip } from "lucide-react";
import { MOCK_SUGGESTED_PROMPTS, MOCK_USER } from "@/lib/mocks";
import { MarginaliaEmptyState } from "@/components/chat/empty-state";
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

export type FirstRunViewProps = {
  /** Called with the first message when the user sends from the landing screen. */
  onStart: (text: string) => void;
  /** True while the parent is creating the conversation (disables submit). */
  isStarting?: boolean;
  /** Set by the parent when auto-create fails; shown inline. */
  error?: string | null;
};

export function FirstRunView({ onStart, isStarting, error }: FirstRunViewProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (message: PromptInputMessage) => {
    const text = (message.text ?? "").trim();
    if (!text || isStarting) return;
    setDraft(""); // controlled textarea: PromptInput's form.reset() can't clear React state
    onStart(text);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <MarginaliaEmptyState
          user={MOCK_USER}
          prompts={MOCK_SUGGESTED_PROMPTS}
          greeting="Good evening"
          onPickPrompt={setDraft}
        />
        <div className="mt-8">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask anything, or paste a draft to revise…"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton aria-label="Attach a file">
                  <Paperclip className="size-4" />
                </PromptInputButton>
                <PromptInputButton aria-label="Formatting">
                  <AlignLeft className="size-4" />
                </PromptInputButton>
              </PromptInputTools>
              {/* "submitted" = creating the conversation, not yet streaming */}
              <PromptInputSubmit status={isStarting ? "submitted" : "ready"} />
            </PromptInputFooter>
          </PromptInput>
          {error && (
            <p className="mt-2 text-center text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
