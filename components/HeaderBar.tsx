"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Cloud,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  Settings2,
  Terminal,
  X,
} from "lucide-react";
import type { OllamaModel, PipelineStage, RoutingMode } from "@/lib/types";
import { Logo } from "./Logo";

interface HeaderBarProps {
  pipelineStage: PipelineStage;
  ollamaOnline: boolean;
  ollamaChecking: boolean;
  ollamaModels: OllamaModel[];
  selectedLocalModel: string;
  onSelectLocalModel: (model: string) => void;
  onRefreshOllama: (customUrl?: string) => void;
  ollamaBaseUrl: string;
  onChangeOllamaBaseUrl: (url: string) => void;
  ollamaError?: string;
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
  ollamaBaseUrl,
  onChangeOllamaBaseUrl,
  ollamaError,
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
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [mobileConfigOpen, setMobileConfigOpen] = useState(false);
  const [tempUrl, setTempUrl] = useState(ollamaBaseUrl);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Auto-expand mobile config if API key warning is triggered
  const showMobileConfig = mobileConfigOpen || highlightApiKeyWarning;

  const handleOpenEndpointModal = () => {
    setTempUrl(ollamaBaseUrl);
    setShowEndpointModal(true);
  };

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isHttpTarget = /^http:\/\//i.test(ollamaBaseUrl);
  const isMixedContent = isHttps && isHttpTarget;

  const handleCopy = (text: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCmd(id);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
  };

  const handleSaveEndpoint = () => {
    const cleaned = tempUrl.trim().replace(/\/+$/, "");
    onChangeOllamaBaseUrl(cleaned);
    onRefreshOllama(cleaned);
    setShowEndpointModal(false);
  };

  const handleApplyPreset = (presetUrl: string) => {
    setTempUrl(presetUrl);
    onChangeOllamaBaseUrl(presetUrl);
    onRefreshOllama(presetUrl);
  };

  const renderPipelinePill = () => {
    if (pipelineStage.phase === "triage") {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FBBF24]/30 bg-[#22252B] px-2.5 py-0.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[11px] text-[#FBBF24] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FBBF24]" />
          <span>Triage...</span>
        </div>
      );
    }

    if (pipelineStage.phase === "streaming") {
      const isLocal = pipelineStage.target === "LOCAL";
      return (
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border bg-[#22252B] px-2.5 py-0.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
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
          <span>{pipelineStage.target}</span>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-[#262930] bg-[#1A1C20] px-2 py-0.5 sm:px-3 sm:py-1 font-mono text-[10px] sm:text-[11px] text-[#9CA3AF] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#6B7280]" />
        <span>Idle</span>
      </div>
    );
  };

  const modes: Array<{ value: RoutingMode; label: string; shortLabel: string }> = [
    { value: "auto", label: "Auto (Triage)", shortLabel: "Auto" },
    { value: "local", label: "Force Local", shortLabel: "Local" },
    { value: "cloud", label: "Force Cloud", shortLabel: "Cloud" },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-[#262930] bg-[#121316]/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:gap-2.5 sm:px-4 sm:py-3">
        {/* Top Row: Brand + Live Pipeline Pill + Compact Mode Switcher + Mobile Config Button */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl clay-control text-[#F3F4F6]">
              <Logo className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <h1 className="text-sm sm:text-[15px] font-semibold tracking-tight text-[#F3F4F6]">
                Smart Split
              </h1>
              {renderPipelinePill()}
            </div>
          </div>

          {/* Routing Mode Segmented Control + Mobile Drawer Toggle */}
          <div className="flex items-center gap-1.5">
            <div
              role="group"
              aria-label="Routing mode"
              className="clay-well inline-flex items-center gap-0.5 sm:gap-1 rounded-xl p-0.5 sm:p-1"
            >
              {modes.map((mode) => {
                const active = routingMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => onChangeRoutingMode(mode.value)}
                    className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? "clay-pill-active text-[#F3F4F6]"
                        : "text-[#9CA3AF] hover:text-[#F3F4F6]"
                    }`}
                  >
                    <span className="sm:hidden">{mode.shortLabel}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile config toggle button */}
            <button
              type="button"
              onClick={() => setMobileConfigOpen((prev) => !prev)}
              aria-label={showMobileConfig ? "Collapse node configuration" : "Expand node configuration"}
              className={`clay-control inline-flex lg:hidden h-7 w-7 items-center justify-center rounded-xl transition-colors cursor-pointer ${
                showMobileConfig || isMixedContent
                  ? "border-[#34D399]/50 text-[#34D399]"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6]"
              }`}
            >
              {showMobileConfig ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Compact Summary Strip (shown only when drawer is closed on mobile) */}
        {!showMobileConfig && (
          <div className="flex lg:hidden items-center justify-between gap-2 rounded-xl bg-[#1A1C20] px-2.5 py-1 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setMobileConfigOpen(true)}
              className="flex flex-1 items-center gap-2 overflow-hidden text-left cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 shrink-0 text-[#9CA3AF]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    ollamaOnline
                      ? "bg-[#34D399]"
                      : isMixedContent
                        ? "bg-[#FBBF24]"
                        : "bg-red-400"
                  }`}
                />
                <span className="truncate max-w-[130px] text-[#F3F4F6]">
                  {ollamaOnline
                    ? selectedLocalModel || "Ollama"
                    : isMixedContent
                      ? "Mixed Content"
                      : "Offline"}
                </span>
              </span>

              <span className="text-[#3A3F4B]">•</span>

              <span className="inline-flex items-center gap-1 shrink-0 text-[#9CA3AF]">
                <Cloud className="h-3 w-3 text-[#60A5FA]" />
                <span
                  className={`truncate max-w-[110px] ${
                    highlightApiKeyWarning
                      ? "text-[#FBBF24] font-semibold"
                      : "text-[#F3F4F6]"
                  }`}
                >
                  {geminiApiKey.trim()
                    ? geminiModel.replace(/^gemini-/, "") || "Gemini"
                    : "Add API Key"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileConfigOpen(true)}
              className="clay-control inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
            >
              <span>Config</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Second Row: Local Ollama Node Config & Cloud Gemini BYOK Config */}
        <div
          className={`grid grid-cols-1 gap-2 sm:gap-2.5 lg:grid-cols-2 ${
            showMobileConfig ? "block" : "hidden lg:grid"
          }`}
        >
          {/* Local Node (Ollama) */}
          <div className="clay-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl p-2.5 sm:px-3 sm:py-2">
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#9CA3AF]" />
                <button
                  type="button"
                  onClick={handleOpenEndpointModal}
                  title="Configure Ollama Endpoint"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium cursor-pointer transition-opacity hover:opacity-80 ${
                    ollamaOnline
                      ? "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]"
                      : isMixedContent
                        ? "border-[#FBBF24]/40 bg-[#FBBF24]/10 text-[#FBBF24]"
                        : "border-red-400/30 bg-red-400/10 text-red-400"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ollamaOnline
                        ? "bg-[#34D399]"
                        : isMixedContent
                          ? "bg-[#FBBF24]"
                          : "bg-red-400"
                    }`}
                  />
                  {ollamaOnline
                    ? "Ollama Online"
                    : isMixedContent
                      ? "Mixed Content"
                      : "Ollama Offline"}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRefreshOllama()}
                  disabled={ollamaChecking}
                  title="Refresh local Ollama models"
                  aria-label="Refresh local Ollama models"
                  className="clay-control inline-flex h-6 w-6 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:text-[#F3F4F6] disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${ollamaChecking ? "animate-spin" : ""}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleOpenEndpointModal}
                  title="Configure Ollama Endpoint & Vercel Tunnel"
                  aria-label="Configure Ollama Endpoint & Vercel Tunnel"
                  className={`clay-control inline-flex h-6 w-6 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                    isMixedContent
                      ? "border-[#FBBF24]/50 text-[#FBBF24] hover:text-[#FBBF24]"
                      : "text-[#9CA3AF] hover:text-[#F3F4F6]"
                  }`}
                >
                  <Settings2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <label
                htmlFor="local-model-select"
                className="font-mono text-[11px] text-[#9CA3AF] shrink-0"
              >
                Model
              </label>
              <select
                id="local-model-select"
                value={selectedLocalModel}
                onChange={(e) => onSelectLocalModel(e.target.value)}
                disabled={!ollamaOnline || ollamaModels.length === 0}
                className="clay-well w-full sm:max-w-[210px] rounded-lg px-2.5 py-1 font-mono text-xs text-[#F3F4F6] outline-none focus:border-[#34D399]/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ollamaModels.length === 0 ? (
                  <option value="">
                    {ollamaOnline
                      ? "No models installed"
                      : isMixedContent
                        ? "Blocked (HTTPS -> HTTP)"
                        : "Offline (check URL)"}
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
          <div className="clay-surface flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl p-2.5 sm:px-3 sm:py-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 text-[#60A5FA] shrink-0">
                <Cloud className="h-3.5 w-3.5" />
                <span className="font-mono text-[11px] font-medium hidden sm:inline">Gemini</span>
              </div>

              <div
                className={`clay-well flex flex-1 items-center gap-1.5 rounded-lg px-2.5 py-1 transition-colors ${
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
                  className="text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer shrink-0"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="clay-well flex items-center rounded-lg px-2.5 py-1 focus-within:border-[#60A5FA]/50 sm:w-[155px] shrink-0">
              <span className="font-mono text-[10px] text-[#6B7280] mr-1.5 sm:hidden">Model:</span>
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

      {/* Ollama Endpoint Configuration Modal */}
      {showEndpointModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ollama-settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
        >
          <div className="clay-surface w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#262930] bg-[#16181C] p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262930] pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-[#34D399]" />
                <h2 id="ollama-settings-title" className="text-sm sm:text-base font-semibold text-[#F3F4F6]">
                  Ollama Node Configuration
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEndpointModal(false)}
                className="rounded-lg p-1 text-[#9CA3AF] hover:bg-[#22252B] hover:text-[#F3F4F6] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3.5 space-y-3.5">
              {/* Mixed Content / Vercel Explainer Alert */}
              {isMixedContent && (
                <div className="rounded-xl border border-[#FBBF24]/35 bg-[#FBBF24]/10 p-3 text-xs text-[#FBBF24]">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#FBBF24]" />
                    <div>
                      <p className="font-semibold text-[#F3F4F6]">
                        Browser Mixed Content Security Block
                      </p>
                      <p className="mt-1 leading-relaxed text-[#FBBF24]/90">
                        This site is served securely via <strong>HTTPS</strong> (Vercel).
                        Modern browsers strictly block HTTPS web pages from making direct requests
                        to unencrypted <code className="rounded bg-[#121316] px-1 py-0.5 font-mono text-[#F3F4F6]">http://localhost:11434</code> endpoints.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Endpoint Input */}
              <div>
                <label className="block font-mono text-xs text-[#9CA3AF]">
                  Ollama Base URL
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="http://localhost:11434 or https://..."
                    spellCheck={false}
                    className="clay-well flex-1 rounded-xl px-3 py-2 font-mono text-xs text-[#F3F4F6] placeholder-[#6B7280] outline-none focus:border-[#34D399]/60"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEndpoint}
                    className="clay-control rounded-xl px-3 sm:px-4 py-2 font-mono text-xs font-medium text-[#F3F4F6] hover:border-[#34D399]/60 cursor-pointer shrink-0"
                  >
                    Save & Test
                  </button>
                </div>
                {ollamaError && !ollamaOnline && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {ollamaError}
                  </p>
                )}
              </div>

              {/* Presets */}
              <div>
                <span className="block font-mono text-[11px] text-[#9CA3AF]">
                  Quick Presets
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("http://localhost:11434")}
                    className="clay-control rounded-lg px-2.5 py-1 font-mono text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
                  >
                    Localhost (11434)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("/api/ollama")}
                    className="clay-control rounded-lg px-2.5 py-1 font-mono text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
                  >
                    Vercel Proxy (/api/ollama)
                  </button>
                </div>
              </div>

              {/* Instructions for Connecting from Vercel */}
              <div className="rounded-xl border border-[#262930] bg-[#121316] p-3 sm:p-4 text-xs text-[#9CA3AF]">
                <div className="flex items-center gap-1.5 font-medium text-[#F3F4F6]">
                  <Terminal className="h-3.5 w-3.5 text-[#34D399]" />
                  <span>How to connect your local Ollama from Vercel in 60s:</span>
                </div>

                <div className="mt-2.5 space-y-2.5 font-mono text-[11px]">
                  <div>
                    <span className="text-[#6B7280]">1. Allow CORS on local Ollama:</span>
                    <div className="mt-1 flex items-center justify-between rounded-lg bg-[#1A1C20] px-2.5 py-1.5 text-[#34D399]">
                      <code className="text-[10.5px] truncate mr-2">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code>
                      <button
                        type="button"
                        onClick={() => handleCopy('OLLAMA_ORIGINS="*" ollama serve', "cors")}
                        className="text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer shrink-0"
                      >
                        {copiedCmd === "cors" ? (
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                        ) : (
                          "Copy"
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#6B7280]">
                      2. Expose port 11434 over HTTPS using Cloudflare Tunnel or ngrok:
                    </span>
                    <div className="mt-1 flex items-center justify-between rounded-lg bg-[#1A1C20] px-2.5 py-1.5 text-[#60A5FA]">
                      <code className="text-[10.5px] truncate mr-2">cloudflared tunnel --url http://localhost:11434</code>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            "cloudflared tunnel --url http://localhost:11434",
                            "cf"
                          )
                        }
                        className="text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer shrink-0"
                      >
                        {copiedCmd === "cf" ? (
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                        ) : (
                          "Copy"
                        )}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between rounded-lg bg-[#1A1C20] px-2.5 py-1.5 text-[#60A5FA]">
                      <code className="text-[10.5px] truncate mr-2">ngrok http 11434</code>
                      <button
                        type="button"
                        onClick={() => handleCopy("ngrok http 11434", "ngrok")}
                        className="text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer shrink-0"
                      >
                        {copiedCmd === "ngrok" ? (
                          <Check className="h-3.5 w-3.5 text-[#34D399]" />
                        ) : (
                          "Copy"
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="font-sans text-[11px] leading-relaxed text-[#9CA3AF]">
                    3. Copy the generated <code className="text-[#F3F4F6]">https://...</code> URL,
                    paste it into the field above, and click <strong>Save & Test</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEndpointModal(false)}
                className="clay-control rounded-xl px-4 py-2 font-mono text-xs text-[#9CA3AF] hover:text-[#F3F4F6] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
