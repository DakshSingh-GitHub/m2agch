"use client";

import React, { useState } from "react";
import {
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  GitFork,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import type { OllamaModel, PipelineStage, RoutingMode } from "@/lib/types";

interface HeaderBarProps {
  pipelineStage: PipelineStage;
  ollamaOnline: boolean;
  ollamaChecking: boolean;
  ollamaModels: OllamaModel[];
  selectedLocalModel: string;
  onSelectLocalModel: (model: string) => void;
  onRefreshOllama: () => void;
  geminiApiKey: string;
  onChangeGeminiApiKey: (key: string) => void;
  geminiModel: string;
  onChangeGeminiModel: (model: string) => void;
  routingMode: RoutingMode;
  onChangeRoutingMode: (mode: RoutingMode) => void;
  highlightApiKeyWarning: boolean;
  apiKeyInputRef: React.RefObject<HTMLInputElement | null>;
}

export function HeaderBar({
  pipelineStage,
  ollamaOnline,
  ollamaChecking,
  ollamaModels,
  selectedLocalModel,
  onSelectLocalModel,
  onRefreshOllama,
  geminiApiKey,
  onChangeGeminiApiKey,
  geminiModel,
  onChangeGeminiModel,
  routingMode,
  onChangeRoutingMode,
  highlightApiKeyWarning,
  apiKeyInputRef,
}: HeaderBarProps) {
  const [showKey, setShowKey] = useState(false);

  const renderPipelinePill = () => {
    if (pipelineStage.phase === "triage") {
      return (
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FBBF24]/30 bg-[#22252B] px-3 py-1 font-mono text-[11px] text-[#FBBF24] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FBBF24]" />
          <span>1. Triage Agent...</span>
        </div>
      );
    }

    if (pipelineStage.phase === "streaming") {
      const isLocal = pipelineStage.target === "LOCAL";
      return (
        <div
          className={`inline-flex items-center gap-2 rounded-full border bg-[#22252B] px-3 py-1 font-mono text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
            isLocal
              ? "border-[#34D399]/35 text-[#34D399]"
              : "border-[#60A5FA]/35 text-[#60A5FA]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 animate-pulse rounded-full ${
              isLocal ? "bg-[#34D399]" : "bg-[#60A5FA]"
            }`}
          />
          <span>2. Streaming {pipelineStage.target}</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#262930] bg-[#1A1C20] px-3 py-1 font-mono text-[11px] text-[#9CA3AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#6B7280]" />
        <span>Idle</span>
      </div>
    );
  };

  const modes: Array<{ value: RoutingMode; label: string }> = [
    { value: "auto", label: "Auto (Triage)" },
    { value: "local", label: "Force Local" },
    { value: "cloud", label: "Force Cloud" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-[#262930] bg-[#121316]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2.5 px-4 py-3">
        {/* Top Row: Brand + Live Pipeline Pill + Routing Mode Segmented Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl clay-control text-[#F3F4F6]">
              <GitFork className="h-4 w-4 text-[#34D399]" />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[15px] font-semibold tracking-tight text-[#F3F4F6]">
                Smart Split
              </h1>
              {renderPipelinePill()}
            </div>
          </div>

          {/* Routing Mode Segmented Control */}
          <div
            role="group"
            aria-label="Routing mode"
            className="clay-well inline-flex items-center gap-1 rounded-xl p-1"
          >
            {modes.map((mode) => {
              const active = routingMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => onChangeRoutingMode(mode.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? "clay-pill-active text-[#F3F4F6]"
                      : "text-[#9CA3AF] hover:text-[#F3F4F6]"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Second Row: Local Ollama Node Config & Cloud Gemini BYOK Config */}
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {/* Local Node (Ollama) */}
          <div className="clay-surface flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-[#9CA3AF]" />
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${
                  ollamaOnline
                    ? "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                    : "border-red-400/30 bg-red-400/10 text-red-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ollamaOnline ? "bg-[#34D399]" : "bg-red-400"
                  }`}
                />
                {ollamaOnline ? "Ollama Online" : "Ollama Offline"}
              </span>
              <button
                type="button"
                onClick={onRefreshOllama}
                disabled={ollamaChecking}
                title="Refresh local Ollama models"
                aria-label="Refresh local Ollama models"
                className="clay-control inline-flex h-6 w-6 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:text-[#F3F4F6] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3 w-3 ${ollamaChecking ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2 min-w-[170px]">
              <label
                htmlFor="local-model-select"
                className="font-mono text-[11px] text-[#9CA3AF]"
              >
                Model
              </label>
              <select
                id="local-model-select"
                value={selectedLocalModel}
                onChange={(e) => onSelectLocalModel(e.target.value)}
                disabled={!ollamaOnline || ollamaModels.length === 0}
                className="clay-well max-w-[210px] flex-1 rounded-lg px-2.5 py-1 font-mono text-xs text-[#F3F4F6] outline-none focus:border-[#34D399]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ollamaModels.length === 0 ? (
                  <option value="">
                    {ollamaOnline ? "No models installed" : "Offline (localhost:11434)"}
                  </option>
                ) : (
                  ollamaModels.map((model) => (
                    <option key={model.name} value={model.name} className="bg-[#1A1C20]">
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Cloud Config (Gemini BYOK) */}
          <div className="clay-surface flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
            <div className="flex items-center gap-1.5 text-[#60A5FA]">
              <Cloud className="h-3.5 w-3.5" />
              <span className="font-mono text-[11px] font-medium">Gemini</span>
            </div>

            <div
              className={`clay-well flex flex-1 min-w-[165px] items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors ${
                highlightApiKeyWarning
                  ? "border-[#FBBF24]/70"
                  : "focus-within:border-[#60A5FA]/50"
              }`}
            >
              <KeyRound className="h-3 w-3 shrink-0 text-[#9CA3AF]" />
              <input
                ref={apiKeyInputRef}
                type={showKey ? "text" : "password"}
                value={geminiApiKey}
                onChange={(e) => onChangeGeminiApiKey(e.target.value)}
                placeholder="Gemini API Key (BYOK)"
                aria-label="Google Gemini API Key"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-transparent font-mono text-xs text-[#F3F4F6] placeholder-[#6B7280] outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                className="text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="clay-well flex w-[160px] shrink-0 items-center rounded-lg px-2.5 py-1 focus-within:border-[#60A5FA]/50">
              <input
                type="text"
                value={geminiModel}
                onChange={(e) => onChangeGeminiModel(e.target.value)}
                placeholder="gemini-2.5-flash"
                aria-label="Gemini Model ID"
                spellCheck={false}
                className="w-full bg-transparent font-mono text-xs text-[#F3F4F6] placeholder-[#6B7280] outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
