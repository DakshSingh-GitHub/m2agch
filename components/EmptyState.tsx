"use client";

import React from "react";
import { ArrowUpRight, Cloud, GitFork, Zap } from "lucide-react";
import type { StarterPrompt } from "@/lib/types";

export const STARTER_PROMPTS: StarterPrompt[] = [
  {
    id: "starter-1",
    label: "Summarize in 3 Bullets",
    prompt:
      "Summarize this into 3 bullet points: Next.js App Router uses React Server Components by default...",
    expectedRoute: "LOCAL",
    category: "Summarization",
  },
  {
    id: "starter-2",
    label: "Grammar & Conciseness",
    prompt:
      "Fix grammar & make concise: Me and my team is building a AST parser for finding circular imports.",
    expectedRoute: "LOCAL",
    category: "Copy Edit",
  },
  {
    id: "starter-3",
    label: "Fenwick Tree (Java)",
    prompt:
      "Write an optimal O(N log N) Fenwick Tree in Java with range update & point query support.",
    expectedRoute: "CLOUD",
    category: "Algorithms",
  },
  {
    id: "starter-4",
    label: "Distributed Rate Limiter",
    prompt:
      "Design a fault-tolerant distributed rate limiter using Redis Lua scripts and handle race conditions.",
    expectedRoute: "CLOUD",
    category: "Architecture",
  },
];

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function EmptyState({ onSelectPrompt, disabled }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="clay-surface w-full max-w-3xl rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="clay-control flex h-10 w-10 items-center justify-center rounded-xl">
              <GitFork className="h-5 w-5 text-[#34D399]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#F3F4F6]">
                Hybrid Local + Cloud AI Router
              </h2>
              <p className="text-sm text-[#9CA3AF]">
                Zero-backend client router. Fast local triage via Ollama with seamless Gemini escalation and rolling 4-message hand-off.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {STARTER_PROMPTS.map((item) => {
            const isLocal = item.expectedRoute === "LOCAL";
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectPrompt(item.prompt)}
                className="clay-control group flex flex-col justify-between rounded-xl p-4 text-left transition-all hover:border-[#343944] hover:bg-[#262A31] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-medium ${
                      isLocal
                        ? "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                        : "border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA]"
                    }`}
                  >
                    {isLocal ? (
                      <Zap className="h-2.5 w-2.5" />
                    ) : (
                      <Cloud className="h-2.5 w-2.5" />
                    )}
                    Expected: {isLocal ? "Local" : "Cloud"}
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#9CA3AF] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#F3F4F6]" />
                </div>

                <p className="mt-2.5 text-[13.5px] leading-snug text-[#F3F4F6]">
                  “{item.prompt}”
                </p>

                <span className="mt-2.5 font-mono text-[11px] text-[#9CA3AF]">
                  {item.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
