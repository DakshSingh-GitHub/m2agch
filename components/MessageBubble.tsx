"use client";

import React from "react";
import { AlertTriangle, Cloud, Cpu, User } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageBubbleProps {
  message: ChatMessage;
  onFocusApiKey?: () => void;
}

export function MessageBubble({ message, onFocusApiKey }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="clay-control max-w-[88%] sm:max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2.5 sm:px-4 sm:py-3">
          <div className="mb-1 flex items-center justify-end gap-1.5 font-mono text-[10px] sm:text-[10.5px] uppercase tracking-wider text-[#9CA3AF]">
            <span>You</span>
            <User className="h-3 w-3" />
          </div>
          <p className="whitespace-pre-wrap text-[14px] sm:text-[14.5px] leading-relaxed text-[#F3F4F6]">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const telemetry = message.telemetry;
  const isLocal = telemetry?.route === "LOCAL";

  return (
    <div className="flex justify-start">
      <div className="clay-surface w-full max-w-[98%] sm:max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md">
        {/* Assistant Body */}
        <div className="px-3.5 py-3 sm:px-5 sm:py-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10.5px] sm:text-[11px] text-[#9CA3AF]">
            {isLocal ? (
              <Cpu className="h-3.5 w-3.5 text-[#34D399]" />
            ) : (
              <Cloud className="h-3.5 w-3.5 text-[#60A5FA]" />
            )}
            <span className="uppercase tracking-wider">Assistant</span>
            {message.isStreaming && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#262930] bg-[#22252B] px-2 py-0.5 text-[10px] text-[#9CA3AF]">
                <span
                  className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                    isLocal ? "bg-[#34D399]" : "bg-[#60A5FA]"
                  }`}
                />
                Streaming
              </span>
            )}
          </div>

          {message.warning && (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#FBBF24]/35 bg-[#FBBF24]/10 px-3.5 py-2.5 text-sm text-[#FBBF24]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{message.warning}</span>
              </div>
              {onFocusApiKey && (
                <button
                  type="button"
                  onClick={onFocusApiKey}
                  className="clay-control rounded-lg px-2.5 py-1 font-mono text-xs text-[#F3F4F6] hover:border-[#FBBF24]/50 cursor-pointer"
                >
                  Enter API Key
                </button>
              )}
            </div>
          )}

          {message.error && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-red-400/35 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <span className="break-words">{message.error}</span>
            </div>
          )}

          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : message.isStreaming && !message.warning && !message.error ? (
            <div className="flex items-center gap-2 py-1 font-mono text-xs text-[#9CA3AF]">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF] [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF] [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CA3AF]" />
              </span>
              <span>
                {message.isThinking ? "Thinking locally..." : "Awaiting first token..."}
              </span>
            </div>
          ) : null}
        </div>

        {/* Sleek JetBrains Mono Telemetry Footer Bar */}
        {telemetry && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-1.5 border-t border-[#262930] bg-[#16181C] px-3 py-1.5 sm:px-5 sm:py-2 font-mono text-[10px] sm:text-[11px] text-[#9CA3AF]">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
              {/* Route Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${
                  isLocal
                    ? "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                    : telemetry.isFailover
                      ? "border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]"
                      : "border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA]"
                }`}
              >
                {isLocal ? "⚡ LOCAL" : "☁️ CLOUD"}
              </span>

              {/* Model Name */}
              <span className="text-[#F3F4F6]">{telemetry.model}</span>

              <span className="text-[#4B5563]">•</span>

              {/* Complexity Score & Triage Reason */}
              <span className="text-[#9CA3AF]">
                {telemetry.isManual ? (
                  <span>{telemetry.reason}</span>
                ) : (
                  <span>
                    Score{" "}
                    <span
                      className={
                        telemetry.isFailover ? "text-[#FBBF24]" : "text-[#F3F4F6]"
                      }
                    >
                      {telemetry.complexity}/10
                    </span>{" "}
                    • {telemetry.reason}
                  </span>
                )}
              </span>
            </div>

            {/* Latency & Speed */}
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <span>
                TTFT:{" "}
                <span className="text-[#F3F4F6]">
                  {telemetry.ttftMs !== null ? `${telemetry.ttftMs}ms` : "—"}
                </span>
              </span>
              <span className="text-[#4B5563]">•</span>
              <span>
                <span className="text-[#F3F4F6]">
                  {telemetry.tokensPerSec !== null
                    ? `${telemetry.tokensPerSec.toFixed(1)} tok/s`
                    : "— tok/s"}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
