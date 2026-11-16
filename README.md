# Smart Split — Hybrid Local + Cloud AI Router

**Smart Split** is a zero-backend, single-page Next.js (App Router, TypeScript) + Tailwind CSS application that routes AI prompts between a local **Ollama** node and **Google Gemini** in the cloud. Every API call executes directly from the browser with live pipeline status, rolling multi-turn context hand-off, streaming Markdown rendering, and per-message telemetry.

---

## Key Features

- **Zero-Backend Client Execution:** All Ollama (`http://localhost:11434`) and Google Gemini (`generativelanguage.googleapis.com`) requests run client-side with `AbortController` cancellation support.
- **2-Stage Multi-Agent Pipeline (`Auto (Triage)`):**
  - **Agent 1 — Local Triage Classifier:** Uses the selected local Ollama model (`stream: false`, `format: "json"`, `think: false` with automatic fallback retry, `num_ctx: 4096`, `temperature: 0.1`) to classify each prompt as `LOCAL` or `CLOUD` alongside a `1–10` complexity score and a brief reason.
  - **4-Second Automatic Cloud Failover:** Wrapped in a 4-second `AbortController` timeout. If Ollama is offline, times out, or returns invalid JSON, the router seamlessly fails over to `CLOUD` (`Score 0/10 • Local node offline — cloud failover`).
  - **Agent 2 — Streaming Execution:** Streams NDJSON chunks from Ollama (`num_ctx: 32768`) or SSE frames from Gemini (`streamGenerateContent?alt=sse`).
- **Manual Routing Overrides:** Switch anytime between `Auto (Triage)`, `Force Local`, and `Force Cloud` using the segmented control in the header.
- **Rolling 4-Message Context Hand-Off:** Maintains conversation state in React and passes the last 4 completed messages (`role` + `content`) to whichever provider handles the next turn, preserving context when switching between Local and Cloud mid-conversation.
- **Live Telemetry & Streaming Markdown UI:**
  - Measures **TTFT** (Time to First Token in ms) and decode speed (`tok/s`).
  - Displays a `JetBrains Mono` telemetry footer under every assistant reply (`⚡ LOCAL` or `☁️ CLOUD`, model name, complexity score & reason, TTFT, and tokens/sec).
  - Renders headings, lists, blockquotes, inline formatting, and fenced code blocks with a 1-click **Copy** button.
  - Shows a `"Thinking locally..."` indicator when local reasoning models emit thinking chunks before visible output.
- **BYOK Cloud Configuration:** Google Gemini API key input is password-masked and automatically persisted in `sessionStorage` (cleared when the browser tab/session closes), paired with an editable Gemini model ID defaulting to `gemini-2.5-flash`.
- **Tactile Matte Dark Claymorphic Design:** Built with `#121316` / `#1A1C20` / `#22252B` matte surfaces, crisp `1px` `#262930` borders, soft dual-shadow depth, `Plus Jakarta Sans` UI typography, and `JetBrains Mono` telemetry/code typography.

---

## Tech Stack

- **Framework:** Next.js `16.4.6` (App Router, Turbopack)
- **Language:** TypeScript `^5`
- **UI & Styling:** React `19.3.0`, Tailwind CSS `4.3.3`, `lucide-react`
- **Fonts:** `Plus Jakarta Sans` & `JetBrains Mono` via `next/font/google`
- **Providers:** Local Ollama REST API + Google Gemini REST SSE API

---

## Project Structure

```text
app/
├── globals.css                # Tailwind v4 theme tokens & matte claymorphic surface styles
├── layout.tsx                 # Root layout loading Plus Jakarta Sans & JetBrains Mono
└── page.tsx                   # Entry page rendering SmartSplitApp
components/
├── EmptyState.tsx             # Welcome card with 4 clickable Local/Cloud starter prompts
├── HeaderBar.tsx              # Pipeline status pill, Ollama health/model picker, Gemini BYOK, mode toggle
├── InputDock.tsx              # Sticky prompt textarea, Stop Generation, Clear Chat, context counter
├── MarkdownRenderer.tsx       # Streaming-safe Markdown parser with 1-click code Copy button
├── MessageBubble.tsx          # User/Assistant bubbles, inline warnings, and JetBrains Mono telemetry bar
└── SmartSplitApp.tsx          # Client state orchestrator, sessionStorage sync, and routing pipeline
lib/
├── ai-router.ts               # Ollama tags/triage/streaming & Gemini SSE streaming clients
└── types.ts                   # Shared TypeScript interfaces for routing, telemetry, and messages
```

---

## Prerequisites & Configuration

### 1. Node.js
Ensure **Node.js 20.9+** is installed.

### 2. Local Node (Ollama) — Optional for Cloud-Only, Required for Local & Triage
1. Install and start [Ollama](https://ollama.com/) listening on `http://localhost:11434`.
2. Pull a local model (the UI automatically selects `bonsai2:9b` if installed, or falls back to the first model returned by `/api/tags`):
   ```bash
   ollama pull bonsai2:9b
   ```
3. **CORS Note (if running from a non-localhost origin or custom port):** Ollama allows `localhost` requests by default in most setups, but if browser requests to `http://localhost:11434` are blocked by CORS, start Ollama with `OLLAMA_ORIGINS`:
   ```bash
   OLLAMA_ORIGINS="*" ollama serve
   ```

### 3. Cloud Node (Google Gemini BYOK)
1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/).
2. Paste the key into the **Gemini API Key (BYOK)** field in the top configuration bar.
   - The key is stored strictly in browser `sessionStorage` (`smart_split_gemini_api_key`) and sent only from your browser to `https://generativelanguage.googleapis.com`.
   - The Gemini model ID defaults to `gemini-2.5-flash` (`smart_split_gemini_model` in `sessionStorage`) and can be edited inline.

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build and run for production:**
   ```bash
   npm run build
   npm run start
   ```

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Next.js development server with Turbopack. |
| `npm run build` | Creates an optimized production build. |
| `npm run start` | Serves the production build locally. |
| `npm run lint` | Runs ESLint across the repository. |
| `npx tsc --noEmit` | Runs TypeScript typechecking without emitting files. |

---

## How the Routing & Telemetry Pipeline Works

1. **Mount & Discovery:** On mount (or when clicking the refresh icon), [SmartSplitApp](./components/SmartSplitApp.tsx) calls `fetchOllamaModels()` in [lib/ai-router.ts](./lib/ai-router.ts) against `GET http://localhost:11434/api/tags` with a 3-second timeout to show `Ollama Online` or `Ollama Offline`.
2. **Stage 1 — Triage (`Auto (Triage)`):**
   - Sends `POST http://localhost:11434/api/chat` with `stream: false`, `format: "json"`, `think: false` (retried without `think` on HTTP `400`), `num_ctx: 4096`, and `temperature: 0.1`.
   - Uses a 4-second `AbortController` timeout. Any timeout, network failure, HTTP error, or invalid JSON response triggers automatic failover to `CLOUD` with `complexity: 0` and `"Local node offline — cloud failover"`.
   - Clicking **Stop** during triage cancels the turn cleanly without falling back to Cloud.
3. **Rolling Context Hand-Off:** Collects up to the last 4 completed, non-error messages from chat history and attaches them as prior context for the target provider (mapped to Gemini's `user` / `model` `contents` schema when routed to Cloud).
4. **Stage 2 — Streaming Execution & Metrics:**
   - **Local (`LOCAL`):** Streams NDJSON from `POST http://localhost:11434/api/chat` (`stream: true`, `num_ctx: 32768`) reading `message.content` (and surfacing `Thinking locally...` if `message.thinking` arrives first).
   - **Cloud (`CLOUD`):** Validates that a Gemini API key is present (showing an inline prompt warning if missing) and streams SSE frames from `POST https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`.
   - **Telemetry:** Records `requestStartTime` and `firstTokenTime` (`TTFT` in ms), estimates token count (`characters / 4`), and calculates decode throughput (`tok/s`) live as tokens arrive.

---

## Starter Prompts for Testing

The empty state in [EmptyState.tsx](./components/EmptyState.tsx) includes four one-click prompts to test both routing paths immediately:

1. **Local (Summarization):** `"Summarize this into 3 bullet points: Next.js App Router uses React Server Components by default..."`
2. **Local (Copy Edit):** `"Fix grammar & make concise: Me and my team is building a AST parser for finding circular imports."`
3. **Cloud (Algorithms):** `"Write an optimal O(N log N) Fenwick Tree in Java with range update & point query support."`
4. **Cloud (Architecture):** `"Design a fault-tolerant distributed rate limiter using Redis Lua scripts and handle race conditions."`

