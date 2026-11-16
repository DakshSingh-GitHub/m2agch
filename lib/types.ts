export type RoutingMode = "auto" | "local" | "cloud";

export type RouteTarget = "LOCAL" | "CLOUD";

export type PipelineStage =
  | { phase: "idle" }
  | { phase: "triage" }
  | { phase: "streaming"; target: RouteTarget };

export interface OllamaModel {
  name: string;
  model?: string;
  size?: number;
  capabilities?: string[];
}

export interface TriageResult {
  route: RouteTarget;
  complexity: number;
  reason: string;
  isFailover?: boolean;
}

export interface TelemetryData {
  route: RouteTarget;
  model: string;
  complexity: number;
  reason: string;
  ttftMs: number | null;
  tokensPerSec: number | null;
  tokenCount: number;
  isFailover?: boolean;
  isManual?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  isStreaming?: boolean;
  isThinking?: boolean;
  error?: string;
  warning?: string;
  telemetry?: TelemetryData;
}

export interface ContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StarterPrompt {
  id: string;
  label: string;
  prompt: string;
  expectedRoute: RouteTarget;
  category: string;
}
