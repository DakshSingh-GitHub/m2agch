import type { ContextMessage, OllamaModel, RouteTarget, TriageResult } from "./types";

export const OLLAMA_BASE_URL = "http://localhost:11434";
export const PREFERRED_LOCAL_MODEL = "bonsai2:9b";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export const TRIAGE_SYSTEM_PROMPT =
  'You are a fast routing classifier. Classify the user prompt as \'LOCAL\' if it is trivial (summarization, formatting, grammar fixes, basic definitions, short rewrites) or \'CLOUD\' if it requires complex multi-step reasoning, system architecture, algorithmic coding, debugging, or deep analysis. Respond ONLY with valid JSON: {"route": "LOCAL" | "CLOUD", "complexity": <1-10>, "reason": "<max 6 words>"}';

const FAILOVER_RESULT: TriageResult = {
  route: "CLOUD",
  complexity: 0,
  reason: "Local node offline — cloud failover",
  isFailover: true,
};

export class UserCancelledError extends Error {
  constructor() {
    super("Generation stopped by user");
    this.name = "UserCancelledError";
  }
}

export interface OllamaTagsResponse {
  models?: OllamaModel[];
}

export async function fetchOllamaModels(
  signal?: AbortSignal
): Promise<{ online: boolean; models: OllamaModel[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { online: false, models: [] };
    }

    const data = (await response.json()) as OllamaTagsResponse;
    const models = Array.isArray(data.models)
      ? data.models.filter((m): m is OllamaModel => typeof m?.name === "string" && m.name.length > 0)
      : [];

    return { online: true, models };
  } catch {
    return { online: false, models: [] };
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

export function pickDefaultLocalModel(
  models: OllamaModel[],
  currentSelection?: string
): string {
  if (currentSelection && models.some((m) => m.name === currentSelection)) {
    return currentSelection;
  }
  const preferred = models.find(
    (m) => m.name === PREFERRED_LOCAL_MODEL || m.model === PREFERRED_LOCAL_MODEL
  );
  if (preferred) {
    return preferred.name;
  }
  return models[0]?.name ?? "";
}

function parseTriageJson(rawContent: string): TriageResult | null {
  if (!rawContent || typeof rawContent !== "string") return null;

  let cleaned = rawContent.trim();
  // Strip optional markdown code fences if a model wraps the JSON output
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Attempt extracting first JSON object substring if trailing text exists
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;

  const rawRoute = typeof record.route === "string" ? record.route.trim().toUpperCase() : "";
  if (rawRoute !== "LOCAL" && rawRoute !== "CLOUD") {
    return null;
  }
  const route: RouteTarget = rawRoute;

  const rawComplexity = Number(record.complexity);
  const complexity = Number.isFinite(rawComplexity)
    ? Math.min(10, Math.max(1, Math.round(rawComplexity)))
    : route === "LOCAL"
      ? 2
      : 8;

  const rawReason =
    typeof record.reason === "string" && record.reason.trim().length > 0
      ? record.reason.trim()
      : route === "LOCAL"
        ? "Simple local task"
        : "Complex reasoning task";

  return {
    route,
    complexity,
    reason: rawReason,
    isFailover: false,
  };
}

export async function runLocalTriage(
  prompt: string,
  localModel: string,
  userSignal?: AbortSignal
): Promise<TriageResult> {
  if (!localModel) {
    return FAILOVER_RESULT;
  }

  if (userSignal?.aborted) {
    throw new UserCancelledError();
  }

  const controller = new AbortController();
  let timedOut = false;
  let cancelledByUser = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 4000);

  const onUserAbort = () => {
    cancelledByUser = true;
    controller.abort();
  };
  userSignal?.addEventListener("abort", onUserAbort, { once: true });

  try {
    const sendTriageRequest = (includeThinkFalse: boolean) =>
      fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: localModel,
          stream: false,
          ...(includeThinkFalse ? { think: false } : {}),
          format: "json",
          options: {
            num_ctx: 4096,
            temperature: 0.1,
          },
          messages: [
            { role: "system", content: TRIAGE_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      });

    let response = await sendTriageRequest(true);

    // Retry once without `think: false` for models/Ollama builds that reject the flag with HTTP 400
    if (response.status === 400) {
      response = await sendTriageRequest(false);
    }

    if (!response.ok) {
      return FAILOVER_RESULT;
    }

    const data = (await response.json()) as {
      message?: { content?: string };
      response?: string;
    };
    const content = data.message?.content ?? data.response ?? "";
    const parsed = parseTriageJson(content);

    return parsed ?? FAILOVER_RESULT;
  } catch {
    if (cancelledByUser || userSignal?.aborted) {
      throw new UserCancelledError();
    }
    if (timedOut) {
      return FAILOVER_RESULT;
    }
    return FAILOVER_RESULT;
  } finally {
    clearTimeout(timeoutId);
    userSignal?.removeEventListener("abort", onUserAbort);
  }
}

export interface StreamCallbacks {
  onThinking?: () => void;
  onDelta: (accumulatedText: string, metrics: {
    ttftMs: number | null;
    tokensPerSec: number | null;
    tokenCount: number;
  }) => void;
}

function computeStreamMetrics(
  requestStartTime: number,
  firstTokenTime: number | null,
  accumulatedText: string,
  chunkCount: number
): { ttftMs: number | null; tokensPerSec: number | null; tokenCount: number } {
  const tokenCount =
    accumulatedText.length > 0
      ? Math.max(1, Math.round(accumulatedText.length / 4))
      : chunkCount;

  if (firstTokenTime === null) {
    return { ttftMs: null, tokensPerSec: null, tokenCount };
  }

  const ttftMs = Math.max(1, Math.round(firstTokenTime - requestStartTime));
  const now = performance.now();
  const decodeElapsedMs = now - firstTokenTime;
  const elapsedSec =
    decodeElapsedMs >= 80
      ? decodeElapsedMs / 1000
      : Math.max(0.05, (now - requestStartTime) / 1000);

  const tokensPerSec = Number((tokenCount / elapsedSec).toFixed(1));
  return { ttftMs, tokensPerSec, tokenCount };
}

export async function streamOllamaChat(
  params: {
    model: string;
    context: ContextMessage[];
    prompt: string;
    signal: AbortSignal;
  },
  callbacks: StreamCallbacks
): Promise<{
  text: string;
  ttftMs: number | null;
  tokensPerSec: number | null;
  tokenCount: number;
}> {
  const { model, context, prompt, signal } = params;
  const requestStartTime = performance.now();

  const messages = [
    ...context.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: prompt },
  ];

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options: {
        num_ctx: 32768,
      },
    }),
  });

  if (!response.ok) {
    let errDetail = `Ollama returned HTTP ${response.status}`;
    try {
      const errJson = (await response.json()) as { error?: string };
      if (errJson?.error) errDetail = errJson.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(errDetail);
  }

  if (!response.body) {
    throw new Error("Ollama response did not include a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedText = "";
  let firstTokenTime: number | null = null;
  let chunkCount = 0;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    try {
      const chunk = JSON.parse(trimmed) as {
        message?: { content?: string; thinking?: string };
        error?: string;
        done?: boolean;
      };

      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (
        typeof chunk.message?.thinking === "string" &&
        chunk.message.thinking.length > 0 &&
        accumulatedText.length === 0
      ) {
        callbacks.onThinking?.();
      }

      const delta = chunk.message?.content ?? "";
      if (delta.length > 0) {
        if (firstTokenTime === null) {
          firstTokenTime = performance.now();
        }
        chunkCount += 1;
        accumulatedText += delta;
        callbacks.onDelta(
          accumulatedText,
          computeStreamMetrics(requestStartTime, firstTokenTime, accumulatedText, chunkCount)
        );
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes("JSON")) {
        throw err;
      }
      // Ignore partial/malformed line fragments
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      processLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    processLine(buffer);
  }

  const finalMetrics = computeStreamMetrics(
    requestStartTime,
    firstTokenTime,
    accumulatedText,
    chunkCount
  );

  return {
    text: accumulatedText,
    ...finalMetrics,
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

function buildGeminiContents(context: ContextMessage[], prompt: string): GeminiContent[] {
  const mapped: GeminiContent[] = [];

  const allMessages: ContextMessage[] = [...context, { role: "user", content: prompt }];

  for (const msg of allMessages) {
    if (!msg.content.trim()) continue;
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const last = mapped[mapped.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text: msg.content });
    } else {
      mapped.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Gemini expects the conversation array to begin with a "user" turn
  if (mapped.length > 0 && mapped[0].role === "model") {
    mapped.unshift({ role: "user", parts: [{ text: "(Continuing previous conversation)" }] });
  }

  return mapped;
}

export async function streamGeminiChat(
  params: {
    apiKey: string;
    model: string;
    context: ContextMessage[];
    prompt: string;
    signal: AbortSignal;
  },
  callbacks: StreamCallbacks
): Promise<{
  text: string;
  ttftMs: number | null;
  tokensPerSec: number | null;
  tokenCount: number;
}> {
  const { apiKey, model, context, prompt, signal } = params;
  const cleanModel = model.trim() || DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cleanModel
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey.trim())}`;

  const requestStartTime = performance.now();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: buildGeminiContents(context, prompt),
    }),
  });

  if (!response.ok) {
    let errMessage = `Gemini API error (HTTP ${response.status})`;
    try {
      const errBody = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      if (errBody?.error?.message) {
        errMessage = errBody.error.message;
      }
    } catch {
      // ignore non-json error response
    }
    throw new Error(errMessage);
  }

  if (!response.body) {
    throw new Error("Gemini API response did not include a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedText = "";
  let firstTokenTime: number | null = null;
  let chunkCount = 0;

  const processEventData = (rawData: string) => {
    const trimmed = rawData.trim();
    if (!trimmed || trimmed === "[DONE]") return;

    try {
      const payload = JSON.parse(trimmed) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
        error?: { message?: string };
      };

      if (payload.error?.message) {
        throw new Error(payload.error.message);
      }

      const parts = payload.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) return;

      const delta = parts
        .map((p) => (typeof p.text === "string" ? p.text : ""))
        .join("");

      if (delta.length > 0) {
        if (firstTokenTime === null) {
          firstTokenTime = performance.now();
        }
        chunkCount += 1;
        accumulatedText += delta;
        callbacks.onDelta(
          accumulatedText,
          computeStreamMetrics(requestStartTime, firstTokenTime, accumulatedText, chunkCount)
        );
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes("JSON")) {
        throw err;
      }
    }
  };

  let currentEventDataLines: string[] = [];

  const handleLine = (rawLine: string) => {
    const line = rawLine.replace(/\r$/, "");
    if (line === "") {
      if (currentEventDataLines.length > 0) {
        processEventData(currentEventDataLines.join("\n"));
        currentEventDataLines = [];
      }
      return;
    }
    if (line.startsWith(":")) {
      return;
    }
    if (line.startsWith("data:")) {
      currentEventDataLines.push(line.slice(5).trimStart());
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      handleLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.length > 0) {
    for (const line of buffer.split("\n")) {
      handleLine(line);
    }
  }
  if (currentEventDataLines.length > 0) {
    processEventData(currentEventDataLines.join("\n"));
  }

  const finalMetrics = computeStreamMetrics(
    requestStartTime,
    firstTokenTime,
    accumulatedText,
    chunkCount
  );

  return {
    text: accumulatedText,
    ...finalMetrics,
  };
}
