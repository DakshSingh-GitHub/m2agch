"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_OLLAMA_BASE_URL,
  fetchOllamaModels,
  pickDefaultLocalModel,
  runLocalTriage,
  streamGeminiChat,
  streamOllamaChat,
  UserCancelledError,
} from "@/lib/ai-router";
import type {
  ChatMessage,
  ContextMessage,
  OllamaModel,
  PipelineStage,
  RouteTarget,
  RoutingMode,
  TelemetryData,
} from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { HeaderBar } from "./HeaderBar";
import { InputDock } from "./InputDock";
import { MessageBubble } from "./MessageBubble";

const SESSION_KEY_API = "smart_split_gemini_api_key";
const SESSION_KEY_MODEL = "smart_split_gemini_model";
const SESSION_STORAGE_EVENT = "smart-split-session-storage";

const LOCAL_KEY_OLLAMA_URL = "smart_split_ollama_base_url";
const LOCAL_STORAGE_EVENT = "smart-split-local-storage";

function subscribeSessionStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_STORAGE_EVENT, callback);
  };
}

function subscribeLocalStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_STORAGE_EVENT, callback);
  };
}

function useLocalStorageValue(key: string, fallbackValue: string): [string, (val: string) => void] {
  const value = useSyncExternalStore(
    subscribeLocalStorage,
    () => {
      try {
        const stored = localStorage.getItem(key);
        return stored !== null && stored.trim() ? stored : fallbackValue;
      } catch {
        return fallbackValue;
      }
    },
    () => fallbackValue
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
        window.dispatchEvent(new Event(LOCAL_STORAGE_EVENT));
      } catch {
        // ignore storage errors
      }
    },
    [key]
  );

  return [value, setValue];
}

function useSessionStorageValue(key: string, fallbackValue: string): [string, (val: string) => void] {
  const value = useSyncExternalStore(
    subscribeSessionStorage,
    () => {
      try {
        const stored = sessionStorage.getItem(key);
        return stored !== null ? stored : fallbackValue;
      } catch {
        return fallbackValue;
      }
    },
    () => fallbackValue
  );

  const setValue = useCallback(
    (next: string) => {
      try {
        sessionStorage.setItem(key, next);
        window.dispatchEvent(new Event(SESSION_STORAGE_EVENT));
      } catch {
        // ignore storage errors
      }
    },
    [key]
  );

  return [value, setValue];
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function SmartSplitApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [routingMode, setRoutingMode] = useState<RoutingMode>("auto");
  const [pipelineStage, setPipelineStage] = useState<PipelineStage>({ phase: "idle" });

  // Ollama state
  const [ollamaBaseUrl, setStoredOllamaBaseUrl] = useLocalStorageValue(
    LOCAL_KEY_OLLAMA_URL,
    DEFAULT_OLLAMA_BASE_URL
  );
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [ollamaChecking, setOllamaChecking] = useState(true);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [selectedLocalModel, setSelectedLocalModel] = useState("");
  const [ollamaError, setOllamaError] = useState<string | undefined>();

  // Cloud (Gemini BYOK) state persisted in sessionStorage
  const [geminiApiKey, setStoredGeminiApiKey] = useSessionStorageValue(SESSION_KEY_API, "");
  const [geminiModel, setStoredGeminiModel] = useSessionStorageValue(
    SESSION_KEY_MODEL,
    DEFAULT_GEMINI_MODEL
  );
  const [highlightApiKeyWarning, setHighlightApiKeyWarning] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const selectedLocalModelRef = useRef(selectedLocalModel);
  const ollamaBaseUrlRef = useRef(ollamaBaseUrl);
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    selectedLocalModelRef.current = selectedLocalModel;
  }, [selectedLocalModel]);

  useEffect(() => {
    ollamaBaseUrlRef.current = ollamaBaseUrl;
  }, [ollamaBaseUrl]);

  const refreshOllamaStatus = useCallback(async (customUrl?: string) => {
    setOllamaChecking(true);
    const targetUrl = customUrl ?? ollamaBaseUrlRef.current;
    const result = await fetchOllamaModels(undefined, targetUrl);
    setOllamaOnline(result.online);
    setOllamaModels(result.models);
    setOllamaError(result.error);
    setSelectedLocalModel((prev) => pickDefaultLocalModel(result.models, prev));
    setOllamaChecking(false);
  }, []);

  // Ping local Ollama node on mount or when URL changes
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchOllamaModels(controller.signal, ollamaBaseUrl).then((result) => {
      if (!active) return;
      setOllamaOnline(result.online);
      setOllamaModels(result.models);
      setOllamaError(result.error);
      setSelectedLocalModel((prev) => pickDefaultLocalModel(result.models, prev));
      setOllamaChecking(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [ollamaBaseUrl]);

  const handleChangeGeminiApiKey = useCallback(
    (value: string) => {
      setStoredGeminiApiKey(value);
      if (value.trim()) {
        setHighlightApiKeyWarning(false);
      }
    },
    [setStoredGeminiApiKey]
  );

  const handleChangeGeminiModel = useCallback(
    (value: string) => {
      setStoredGeminiModel(value);
    },
    [setStoredGeminiModel]
  );

  const rollingContext = useMemo<ContextMessage[]>(() => {
    const validCompleted = messages.filter(
      (m) => !m.isStreaming && !m.error && !m.warning && m.content.trim().length > 0
    );
    return validCompleted.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const isBusy = pipelineStage.phase !== "idle";

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleClear = useCallback(() => {
    if (isBusy) return;
    setMessages([]);
    setHighlightApiKeyWarning(false);
    setPipelineStage({ phase: "idle" });
  }, [isBusy]);

  const handleFocusApiKey = useCallback(() => {
    apiKeyInputRef.current?.focus();
    apiKeyInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const executePrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || pipelineStage.phase !== "idle") return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const contextSnapshot = rollingContext;

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: prompt,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      let targetRoute: RouteTarget = "CLOUD";
      let complexity = 0;
      let reason = "";
      let isFailover = false;
      let isManual = false;

      try {
        // Step 1: Agent 1 Triage or Manual Override
        if (routingMode === "auto") {
          setPipelineStage({ phase: "triage" });
          const triage = await runLocalTriage(
            prompt,
            selectedLocalModelRef.current,
            controller.signal,
            ollamaBaseUrlRef.current
          );
          targetRoute = triage.route;
          complexity = triage.complexity;
          reason = triage.reason;
          isFailover = Boolean(triage.isFailover);
        } else if (routingMode === "local") {
          targetRoute = "LOCAL";
          isManual = true;
          reason = "Manual override: Force Local";
        } else {
          targetRoute = "CLOUD";
          isManual = true;
          reason = "Manual override: Force Cloud";
        }

        const activeModel =
          targetRoute === "LOCAL"
            ? selectedLocalModelRef.current
            : geminiModel.trim() || DEFAULT_GEMINI_MODEL;

        const baseTelemetry: TelemetryData = {
          route: targetRoute,
          model: activeModel || "unavailable",
          complexity,
          reason,
          ttftMs: null,
          tokensPerSec: null,
          tokenCount: 0,
          isFailover,
          isManual,
        };

        // Validate Local availability in Force Local mode
        if (targetRoute === "LOCAL" && (!ollamaOnline || !activeModel)) {
          const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
          const isHttpTarget = /^http:\/\//i.test(ollamaBaseUrlRef.current);
          const isMixed = isHttps && isHttpTarget;

          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: "",
              createdAt: Date.now(),
              warning: isMixed
                ? "Mixed Content Error: Browsers block http://localhost:11434 on HTTPS (Vercel). Open Ollama settings in the top bar to set an https:// tunnel or /api/ollama proxy."
                : ollamaError
                  ? `Ollama connection error: ${ollamaError}. Check your URL or start Ollama and refresh.`
                  : "Local Ollama node is offline or no model is selected. Start Ollama and click Refresh, or switch to Auto / Force Cloud.",
              telemetry: baseTelemetry,
            },
          ]);
          setPipelineStage({ phase: "idle" });
          return;
        }

        // Validate Cloud API key before calling Gemini
        if (targetRoute === "CLOUD" && !geminiApiKey.trim()) {
          setHighlightApiKeyWarning(true);
          setMessages((prev) => [
            ...prev,
            {
              id: createId(),
              role: "assistant",
              content: "",
              createdAt: Date.now(),
              warning:
                "Missing Google Gemini API key. Paste your key in the top bar (stored in sessionStorage) to execute Cloud routes.",
              telemetry: baseTelemetry,
            },
          ]);
          setPipelineStage({ phase: "idle" });
          return;
        }

        // Step 2: Agent 2 Streaming Execution
        const assistantId = createId();
        setPipelineStage({ phase: "streaming", target: targetRoute });

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            createdAt: Date.now(),
            isStreaming: true,
            telemetry: baseTelemetry,
          },
        ]);

        const onThinking = () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId && !msg.isThinking
                ? { ...msg, isThinking: true }
                : msg
            )
          );
        };

        const onDelta = (
          accumulatedText: string,
          metrics: { ttftMs: number | null; tokensPerSec: number | null; tokenCount: number }
        ) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    isThinking: false,
                    content: accumulatedText,
                    telemetry: msg.telemetry
                      ? {
                          ...msg.telemetry,
                          ttftMs: metrics.ttftMs,
                          tokensPerSec: metrics.tokensPerSec,
                          tokenCount: metrics.tokenCount,
                        }
                      : undefined,
                  }
                : msg
            )
          );
        };

        const result =
          targetRoute === "LOCAL"
            ? await streamOllamaChat(
                {
                  model: activeModel,
                  context: contextSnapshot,
                  prompt,
                  signal: controller.signal,
                  baseUrl: ollamaBaseUrlRef.current,
                },
                { onThinking, onDelta }
              )
            : await streamGeminiChat(
                {
                  apiKey: geminiApiKey,
                  model: activeModel,
                  context: contextSnapshot,
                  prompt,
                  signal: controller.signal,
                },
                { onDelta }
              );

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: result.text || "(Empty response returned by model)",
                  isStreaming: false,
                  isThinking: false,
                  telemetry: msg.telemetry
                    ? {
                        ...msg.telemetry,
                        ttftMs: result.ttftMs,
                        tokensPerSec: result.tokensPerSec,
                        tokenCount: result.tokenCount,
                      }
                    : undefined,
                }
              : msg
          )
        );
      } catch (err) {
        const isAbort =
          err instanceof UserCancelledError ||
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError");

        if (isAbort) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.isStreaming
                ? {
                    ...msg,
                    content: msg.content || "_Generation stopped by user._",
                    isStreaming: false,
                  }
                : msg
            )
          );
        } else {
          const message =
            err instanceof Error ? err.message : "Unexpected streaming error";
          setMessages((prev) => {
            const hasStreaming = prev.some((m) => m.isStreaming);
            if (hasStreaming) {
              return prev.map((msg) =>
                msg.isStreaming
                  ? {
                      ...msg,
                      isStreaming: false,
                      error: message,
                    }
                  : msg
              );
            }
            return [
              ...prev,
              {
                id: createId(),
                role: "assistant",
                content: "",
                createdAt: Date.now(),
                error: message,
              },
            ];
          });
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setPipelineStage({ phase: "idle" });
      }
    },
    [
      geminiApiKey,
      geminiModel,
      ollamaError,
      ollamaOnline,
      pipelineStage.phase,
      rollingContext,
      routingMode,
    ]
  );

  const handleSubmit = useCallback(() => {
    void executePrompt(input);
  }, [executePrompt, input]);

  return (
    <div className="flex min-h-screen flex-col bg-[#121316] text-[#F3F4F6]">
      <HeaderBar
        pipelineStage={pipelineStage}
        ollamaOnline={ollamaOnline}
        ollamaChecking={ollamaChecking}
        ollamaModels={ollamaModels}
        selectedLocalModel={selectedLocalModel}
        onSelectLocalModel={setSelectedLocalModel}
        onRefreshOllama={refreshOllamaStatus}
        ollamaBaseUrl={ollamaBaseUrl}
        onChangeOllamaBaseUrl={setStoredOllamaBaseUrl}
        ollamaError={ollamaError}
        geminiApiKey={geminiApiKey}
        onChangeGeminiApiKey={handleChangeGeminiApiKey}
        geminiModel={geminiModel}
        onChangeGeminiModel={handleChangeGeminiModel}
        routingMode={routingMode}
        onChangeRoutingMode={setRoutingMode}
        highlightApiKeyWarning={highlightApiKeyWarning}
        apiKeyInputRef={apiKeyInputRef}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState
            onSelectPrompt={(prompt) => void executePrompt(prompt)}
            disabled={isBusy}
          />
        ) : (
          <div className="flex flex-col gap-5 pb-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onFocusApiKey={handleFocusApiKey}
              />
            ))}
            <div ref={bottomAnchorRef} />
          </div>
        )}
      </main>

      <InputDock
        input={input}
        onChangeInput={setInput}
        onSubmit={handleSubmit}
        onStop={handleStop}
        onClear={handleClear}
        isBusy={isBusy}
        hasMessages={messages.length > 0}
        contextWindowCount={rollingContext.length}
      />
    </div>
  );
}
