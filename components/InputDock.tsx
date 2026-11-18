"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUp, Square, Trash2 } from "lucide-react";

interface InputDockProps {
  input: string;
  onChangeInput: (val: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onClear: () => void;
  isBusy: boolean;
  hasMessages: boolean;
  contextWindowCount: number;
}

export function InputDock({
  input,
  onChangeInput,
  onSubmit,
  onStop,
  onClear,
  isBusy,
  hasMessages,
  contextWindowCount,
}: InputDockProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isBusy && input.trim().length > 0) {
        onSubmit();
      }
    }
  };

  return (
    <div className="sticky bottom-0 z-10 border-t border-[#262930] bg-[#121316]/95 px-3 py-2 sm:px-4 sm:py-3 backdrop-blur-sm pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-4xl">
        <div className="clay-surface rounded-2xl p-2 sm:p-2.5">
          <div className="flex items-end gap-1.5 sm:gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => onChangeInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (Smart Split auto-routes)..."
              aria-label="Prompt input"
              className="max-h-[160px] min-h-[38px] sm:min-h-[42px] flex-1 resize-none bg-transparent px-2 sm:px-2.5 py-1.5 sm:py-2 text-[14px] sm:text-[14.5px] leading-relaxed text-[#F3F4F6] placeholder-[#6B7280] outline-none"
            />

            <div className="flex items-center gap-1 sm:gap-1.5 pb-0.5 shrink-0">
              <button
                type="button"
                onClick={onClear}
                disabled={!hasMessages || isBusy}
                title="Clear chat"
                aria-label="Clear chat"
                className="clay-control inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[#343944] hover:text-[#F3F4F6] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>

              {isBusy ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generation"
                  className="clay-control inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border-[#FBBF24]/40 bg-[#22252B] px-3 sm:px-3.5 text-xs font-medium text-[#FBBF24] transition-colors hover:bg-[#292D35] cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={input.trim().length === 0}
                  aria-label="Send prompt"
                  className="clay-control inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-xl bg-[#22252B] px-3 sm:px-3.5 text-xs font-semibold text-[#F3F4F6] transition-colors hover:border-[#3A3F4B] hover:bg-[#2A2E36] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <span className="hidden sm:inline">Send</span>
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between px-1 font-mono text-[10px] sm:text-[11px] text-[#6B7280]">
          <span className="hidden sm:inline">Enter to send • Shift+Enter for newline</span>
          <span className="sm:hidden text-[10px]">Auto-triage routing</span>
          <span>
            Context: {contextWindowCount}/4
          </span>
        </div>
      </div>
    </div>
  );
}
