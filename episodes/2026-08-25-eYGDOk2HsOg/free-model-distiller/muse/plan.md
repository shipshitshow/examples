# YouTube Distiller — Build Plan (Muse Spark)

> Standalone Bun + TypeScript tool. One engine (`pipeline.ts`), two faces (`cli.ts`, `server.ts`).
> Free-tier invariant: **exactly 1 model request per video**. Everything else is local.
> Runtime execution model: **Muse Spark (`opencode/muse-spark-1.2-contributor-free`) — kept as-is because it's working.** The OpenRouter `MODEL_ID` below remains a single configurable constant for the distiller's own LLM call, but the agent executing this plan stays on Muse.

---

## A) File Layout and Ownership

```
openrouterfree/
├── package.json              # Bun scripts, no npm. bun.lock committed.
├── tsconfig.json             # strict: true, noImplicitAny, etc.
├── bun.lock
├── .gitignore                # tmp/, *.mp4, *.json3, .env
├── src/
│   ├── config.ts             # Single source of truth for model + env
│   ├── types.ts              # Shared types (ProgressEvent, TranscriptWord, DistillResult, Moment)
│   ├── pipeline.ts           # Engine — orchestrates 4 steps, emits ProgressEvents, owns RequestCounter
│   ├── yt.ts                 # yt-dlp shell-out wrapper (download + captions)
│   ├── transcript.ts         # json3 → WordTimedTranscript parser (pure, zero IO beyond file read)
│   ├── llm.ts                # Single OpenRouter fetch + 429 fallback chain (the ONLY fetch to OpenRouter)
│   ├── schema.ts             # Strict JSON validator: unknown → DistillResult type guard
│   ├── clip.ts               # ffmpeg shell-out cutter
│   ├── counter.ts            # RequestCounter class
│   ├── cli.ts                # CLI face — subscribes to pipeline events, prints to terminal
│   └── server.ts             # Server face — Bun.serve, SSE forwarder + static HTML + clip serving
├── public/
│   └── index.html            # Single static file. No React, no bundler. SSE client + clip player
└── tmp/                      # Ephemeral per-run dir (gitignored): video.mp4, captions.json3, clips/
```

| File | Owns | Must NOT own |
|---|---|---|
| `src/config.ts:1` | `MODEL_ID`, `FALLBACK_MODELS` constants, `getApiKey()` guard, `OPENROUTER_API_KEY` access | Any fetch or logging of the key |
| `src/types.ts:1` | `ProgressEvent`, `TranscriptWord`, `Transcript`, `Moment`, `DistillResult` interfaces | Runtime logic |
| `src/pipeline.ts:1` | Orchestration, `EventEmitter`/async-generator of `ProgressEvent`, owns `RequestCounter` instance, temp-dir lifecycle | Direct `fetch`, direct `spawn` — delegates to `yt.ts`/`llm.ts`/`clip.ts` |
| `src/yt.ts:1` | `yt-dlp` spawn: download + `--write-auto-sub --sub-lang en --sub-format json3 --skip-download` probe, file discovery | Model calls, transcript parsing |
| `src/transcript.ts:1` | Pure function `parseJson3(raw: unknown): Transcript` | File IO, network |
| `src/llm.ts:1` | The **only** `fetch("https://openrouter.ai/api/v1/chat/completions")` in the repo, fallback on 429, timeout via `AbortController` | Anything deterministic |
| `src/schema.ts:1` | `validateDistillResult(raw: unknown): DistillResult` — type guards, bounds checks | Fetch, file IO |
| `src/clip.ts:1` | `ffmpeg -ss start -to end -i input -c copy` (fallback to re-encode if copy fails), clip manifest | Model calls |
| `src/counter.ts:1` | `RequestCounter` — `increment()`, `value`, `budgetString()` | Any other state |
| `src/cli.ts:1` | Arg parse (`bun src/cli.ts <url> [--out tmp]`), subscribes to pipeline events, pretty-prints to stderr/stdout | Server logic |
| `src/server.ts:1` | `Bun.serve({ fetch })`, `GET /` → `public/index.html`, `GET /api/distill?url=` → SSE stream, `GET /clips/*` → static files | Pipeline orchestration |
| `public/index.html:1` | URL input, `EventSource` consumer, renders `brief` + ranked moments + `<video>` tags for clips | Build step |

**Dependency budget:** `zod` is acceptable for validation if kept minimal; otherwise hand-rolled type guards. No other runtime deps. `yt-dlp` and `ffmpeg` are external binaries, checked via `which`/`spawn` at startup.

---

## B) Exact json3 Parsing Approach

### json3 shape (from `yt-dlp --sub-format json3`)

```json
{
  "events": [
    {
      "tStartMs": 1240,
      "dDurationMs": 3200,
      "segs": [{ "utf8": "hello ", "tOffsetMs": 0 }, { "utf8": "world", "tOffsetMs": 400 }],
      "wWinId": 1
    }
  ]
}
```

Source: `yt-dlp` writes `<id>.en.json3` (or `<id>.en.auto.json3`). We glob `tmp/<id>/*.json3` and pick the first match.

### Algorithm (`src/transcript.ts:1`)

1. **Read + JSON parse as `unknown`.** Guard that top-level has `events: unknown[]`, else throw `TranscriptParseError`.
2. **Iterate `events`.** Skip events where `segs` is absent/null (header events, e.g. `tStartMs: 0` with no `segs` carry formatting metadata). Skip events where `wWinId` indicates non-speech if `segs` empty.
3. **Per segment:** `absoluteMs = event.tStartMs + segment.tOffsetMs`. Both are integers; `tOffsetMs` is offset *within* the event. This is the spec formula — do not use `dDurationMs`.
4. **Per word handling:** `utf8` may contain leading/trailing spaces and may be a partial word. Trim end, keep internal spaces normalized to single space later. Emit one `TranscriptWord` per seg where `utf8.trim().length > 0`:
   ```ts
   { text: seg.utf8.trim(), startMs: absoluteMs, endMs: absoluteMs /* computed below */ }
   ```
   The `seg` array has no per-seg duration; infer `endMs` as `nextWord.startMs` (or `event.tStartMs + event.dDurationMs` for last seg in event). This gives conservative clip boundaries.
5. **Collapse:** `words: TranscriptWord[]` sorted by `startMs` (already ordered, but enforce). Also produce `fullText: string` = `words.map(w => w.text).join(" ")` and `durationSeconds = lastWord.endMs / 1000`.
6. **Timestamped transcript for LLM:** render as `words` chunked into ~30s lines to give the model anchor points without inflating tokens: `[00:12] hello world ...` — derived from `startMs`, not model-generated.
7. **Edge cases:** empty `events` → throw `NoCaptionsError`; file not found → `NoCaptionsError`; malformed JSON → `TranscriptParseError`. All are local errors, zero model cost.

**Validation of parser output:** `words.length > 0`, monotonically increasing `startMs`, `durationSeconds > 0`. Log word count + duration for debugging (no key).

---

## C) The Single Request: Message Shape and JSON Schema

### Config (`src/config.ts:1`)

```ts
// Distiller LLM — single configurable constant (one-line switch).
// Execution agent stays on Muse Spark (opencode/muse-spark-1.2-contributor-free) per runtime note.
export const MODEL_ID = "minimax/minimax-m3:free" as const;
export const FALLBACK_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
] as const;
```

One-line switch. `llm.ts` reads this constant; no other file references a model string. If Muse is available as an OpenRouter free route in your account, swap `MODEL_ID` to that route in one line — execution agent remains Muse regardless.

### Request shape (`src/llm.ts:1`)

- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Headers:** `Authorization: Bearer ${OPENROUTER_API_KEY}`, `Content-Type: application/json`, `HTTP-Referer` + `X-Title` (optional, OpenRouter analytics).
- **Body:**
  ```json
  {
    "model": "minimax/minimax-m3:free",
    "messages": [
      { "role": "system", "content": "<system prompt — strict JSON, English only, role + constraints>" },
      { "role": "user",   "content": "<transcript + output schema + rules>" }
    ],
    "temperature": 0.2,
    "max_tokens": 4000,
    "response_format": { "type": "json_object" }
  }
  ```
  `response_format: json_object` is supported on OpenRouter free routes and forces JSON mode; if the route ignores it, the prompt still demands raw JSON with no markdown fences.

- **System message (fixed, deterministic):**
  > You are a YouTube distiller. You receive a full English transcript with [mm:ss] anchors. Return ONLY valid JSON matching the provided schema. No prose outside JSON, no markdown fences. English only. Moments must be within transcript duration, non-overlapping preferred, each 15–90s.

- **User message (templated, ~15K tokens for 47m video):**
  ```
  Transcript duration: 47:12 (2832s), 8234 words.
  Transcript:
  [00:00] ...
  [00:31] ...

  Task: produce JSON with:
  - brief: 3-6 sentence summary of what the video actually covers (not generic hype).
  - moments: 3-5 ranked highlights, each with startSeconds, endSeconds, title (hook, <=60 chars), reason (1 sentence, why worth watching).

  Rules:
  - startSeconds/endSeconds are integers, 0 <= start < end <= 2832, duration 15-90s.
  - Sorted by rank 1..N (1 = best).
  - No overlapping moments preferred; if overlap unavoidable, keep <5s overlap.
  - Return ONLY the JSON object.
  ```

### JSON Schema demanded back

```json
{
  "type": "object",
  "required": ["brief", "moments"],
  "additionalProperties": false,
  "properties": {
    "brief": { "type": "string", "minLength": 80, "maxLength": 800 },
    "moments": {
      "type": "array",
      "minItems": 3,
      "maxItems": 5,
      "items": {
        "type": "object",
        "required": ["rank", "title", "reason", "startSeconds", "endSeconds"],
        "additionalProperties": false,
        "properties": {
          "rank":         { "type": "integer", "minimum": 1, "maximum": 5 },
          "title":        { "type": "string", "minLength": 5, "maxLength": 60 },
          "reason":       { "type": "string", "minLength": 10, "maxLength": 200 },
          "startSeconds": { "type": "integer", "minimum": 0 },
          "endSeconds":   { "type": "integer", "minimum": 1 }
        }
      }
    }
  }
}
```

Additional semantic checks enforced in `schema.ts` (not JSON Schema): `startSeconds < endSeconds`, `15 <= duration <= 90`, `endSeconds <= transcriptDurationSeconds`, `rank` is `1..N` contiguous, `title`/`reason` are English (no script validation — heuristic: no empty).

---

## D) Validation and Malformed Output

**Principle:** one request already spent; do not spend a second to "fix" JSON. Validate strictly, fail loudly with actionable message.

`src/schema.ts:1` — `validateDistillResult(raw: unknown, durationSeconds: number): DistillResult`

1. **Pre-parse sanitization (local, zero cost):**
   - If `raw` is string (model `content` field), trim, strip leading/trailing ```json / ``` fences via regex `^```(?:json)?\s*|\s*```$`, trim again.
   - `JSON.parse` inside try/catch. On `SyntaxError` → throw `ValidationError("Model returned invalid JSON")` with first 500 chars of raw for debugging (never the key).

2. **Structural validation (type guards, no `any`):**
   - Assert `typeof obj === "object" && obj !== null`.
   - `brief`: `typeof === "string"` + length bounds.
   - `moments`: `Array.isArray` + `3 <= length <= 5`.
   - Per moment: field presence + `typeof`/`Number.isInteger` + range checks.
   - Semantic: `start < end`, `15 <= end-start <= 90`, `end <= durationSeconds`, `rank` contiguous `1..N` (sort by rank before checking), titles non-empty, reasons non-empty.

3. **On failure:**
   - Throw `ValidationError` with `issues: string[]` (all violations, not just first).
   - `pipeline.ts` catches, emits `ProgressEvent { phase: "analyze", status: "error", message, issues }`, aborts pipeline before `ffmpeg` (no point cutting bad timestamps).
   - CLI prints issues + hint: "Model returned malformed JSON — retry (costs 1 more request) or try a different free model via config.ts:1".
   - Server SSE sends `event: error` with same payload; UI renders issues + retry button (retry = new pipeline run = new request, user-initiated only).
   - **No automatic retry that consumes another request.** A retry must be an explicit user action so the 1000/day budget is never burned silently.

4. **On success:** return typed `DistillResult` and proceed to `clip.ts`.

---

## E) Failure Handling

| Failure | Detection | Handling | Request cost |
|---|---|---|---|
| **Missing `OPENROUTER_API_KEY`** | `config.ts:getApiKey()` checks `process.env.OPENROUTER_API_KEY` at pipeline start | Throw `MissingKeyError` before any work; `pipeline.ts` emits `error` immediately; CLI prints `export OPENROUTER_API_KEY=...`; server returns `event: error` on SSE. Never log/print/write the key. | 0 |
| **yt-dlp failure** (bad URL, private video, network) | `spawn("yt-dlp", args)` non-zero exit, stderr contains `ERROR:` | `yt.ts` throws `YtDlpError` with sanitized stderr (strip any key if leaked), `pipeline.ts` emits `phase: "download", status: "error"`, aborts. Suggest: check URL, check `yt-dlp --version`, check network. | 0 |
| **No captions available** | `yt-dlp` succeeds but no `*.json3` file found, or `--list-subs` shows no `en`/`en-auto` | Throw `NoCaptionsError("No English auto-captions found")`. Emit error event. Advise: video has no captions, try another video. Do not call model. | 0 |
| **Rate limited (429)** | `fetch` returns `status === 429` | `llm.ts` fallback chain: retry same request with `FALLBACK_MODELS[0]`, then `[1]`, each as a **new fetch** (counts as a new request against the 20/min budget). Respect `Retry-After` header if present (sleep locally, do not busy-loop). After all fallbacks 429 → throw `RateLimitedError` with `retryAfterSeconds`. `pipeline.ts` emits `phase: "analyze", status: "error", message: "Free tier throttled..."`. CLI/server surface `Retry-After` + "try again in N seconds, or change MODEL_ID in config.ts:1". Counter reflects actual fetches attempted (e.g., 3 if both fallbacks tried). | 1–3 (visible via counter) |
| **Model timeout** | `AbortController` with 90s timeout (configurable) around `fetch` | Abort, throw `ModelTimeoutError`. Do **not** auto-retry (would double-spend). Emit error event. Advise: model overloaded, retry or switch `MODEL_ID`. | 1 (the timed-out attempt counts if provider counted it; counter incremented on send, not on success) |
| **ffmpeg failure** | `spawn("ffmpeg", ...)` non-zero exit | `clip.ts` retries that single clip with re-encode (`-c:v libx264 -c:a aac`) once; if still fails, marks that moment as failed but continues other clips. Emits `phase: "clip", status: "error"` per-moment, final result includes `clips: { moment, path, ok, error? }[]`. | 0 |
| **Transcript too long** (>1M context edge) | `transcript.ts` word count / char count check | Warn but still send — 47m ≈ 15K tokens is safe; a 3h video would be ~60K tokens, still under 1M. If `fullText.length > 800_000` chars, truncate middle with `[…truncated…]` marker and note in prompt. | 0–1 |

**Global rules:**
- Errors are typed (`MissingKeyError`, `YtDlpError`, `NoCaptionsError`, `ValidationError`, `RateLimitedError`, `ModelTimeoutError`, `ClipError`) so CLI/server can branch on `instanceof`/code.
- Never swallow errors; every `catch` re-emits as `ProgressEvent` with `status: "error"` and preserves `cause`.
- Temp dir cleanup on failure: leave `tmp/<runId>/` for debugging unless `--clean` flag; server auto-cleans after 30m via `setTimeout`.

---

## F) Request Counter

**Why:** free tier is 20/min and 1000/day on *requests*, not tokens. User must see spend per run and cumulative.

`src/counter.ts:1`

```ts
class RequestCounter {
  private n = 0;
  increment(): number { return ++this.n; }
  get value(): number { return this.n; }
  toString(): string { return `${this.n} request(s)`; }
  budgetString(): string { return `${this.n}/1000 today (limit is requests, not tokens)`; }
}
```

- **Ownership:** instantiated once in `pipeline.ts` at run start, passed to `llm.ts`. Only `llm.ts` calls `increment()` — immediately before each `fetch` to OpenRouter (including fallbacks). No other file increments.
- **Visibility:**
  - Every `ProgressEvent` carries `requestCount: number` (current counter value) so consumers can render a live badge.
  - Final `ProgressEvent { phase: "done", requestCount, brief, moments, clips }` includes `requestCount` for summary.
  - CLI prints `Requests used: 1/1000 (1 per video)` on success, `Requests used: 3/1000 (1 primary + 2 fallbacks, all 429)` on fallback path.
  - Server SSE sends `event: progress` with `requestCount`; UI shows persistent pill `● 1 request used — 999 remaining today` (client-side estimate; true daily count requires dashboard).
  - On 429, UI/CLI explicitly says "This run spent N requests due to fallbacks".
- **Invariant check:** `pipeline.ts` asserts `counter.value <= 3` at end (1 primary + 2 fallbacks max). If ever >1 on success, log warning — indicates a bug violating the single-request design.

---

## G) Progress Event Shape and Consumption

### Event type (`src/types.ts:1`)

```ts
type PipelinePhase = "download" | "transcribe" | "analyze" | "clip" | "done";

interface ProgressEvent {
  phase: PipelinePhase;
  status: "start" | "progress" | "done" | "error";
  message: string;          // human-readable, English
  percent?: number;         // 0-100, for download/clip progress
  requestCount: number;     // from RequestCounter
  timestamp: number;        // Date.now()
  // only on phase==="done" && status==="done":
  result?: DistillResult & { clips: ClipInfo[] };
  // only on status==="error":
  error?: { code: string; details?: string; retryAfterSeconds?: number; issues?: string[] };
}
```

- `pipeline.ts` exposes `async function* run(url: string): AsyncGenerator<ProgressEvent>` **or** `EventEmitter`-style `on("progress", cb)`. Prefer `AsyncGenerator` — simpler to forward to both SSE and CLI without manual wiring.
- Phases in order: `download:start → download:done → transcribe:start/done → analyze:start → analyze:done|error → clip:start → clip:progress (per clip) → clip:done → done:done`.
- `analyze` is the only phase where `requestCount` may increment.

### CLI consumption (`src/cli.ts:1`)

- `for await (const ev of pipeline.run(url))` loop.
- Renders with simple `console.error` / `console.log` (no heavy deps like `ora` — maybe `chalk` if already present, else ANSI codes manually).
- Example output:
  ```
  [download] start — fetching video + captions…
  [download] done — 47:12 video, captions found
  [transcribe] done — 8234 words
  [analyze] start — 1 request to minimax/minimax-m3:free (15K tokens)…
  [analyze] done — brief + 4 moments (1 request used)
  [clip] progress — cutting 1/4 "The hook title" [00:12–01:05]…
  [done] 4 clips ready in tmp/abc123/ — Requests used: 1/1000
  ```
- On `error`, print `error.code` + `message` + `details` to `stderr`, exit `process.exit(1)`.

### SSE consumption (`src/server.ts:1` + `public/index.html:1`)

- `server.ts`:
  ```ts
  Bun.serve({
    port: 3000,
    fetch(req) {
      if (url.pathname === "/api/distill") {
        // validate ?url=, set headers: "Content-Type: text/event-stream", "Cache-Control: no-cache"
        // for await (const ev of pipeline.run(url)) { controller.enqueue(`event: ${ev.phase}\ndata: ${JSON.stringify(ev)}\n\n`) }
      }
      if (url.pathname.startsWith("/clips/")) return new Response(Bun.file(...));
      return new Response(Bun.file("public/index.html"));
    }
  });
  ```
  Each `ProgressEvent` is serialized as an SSE `data:` frame. `event:` field is `ev.phase` so client can `addEventListener("analyze", ...)`.
  Headers: `Content-Type: text/event-stream`, `Connection: keep-alive`, `Cache-Control: no-cache`.

- `public/index.html:1`:
  ```js
  const es = new EventSource(`/api/distill?url=${encodeURIComponent(url)}`);
  es.addEventListener("download", e => renderPhase(JSON.parse(e.data)));
  es.addEventListener("analyze", e => { const ev = JSON.parse(e.data); badge.textContent = `${ev.requestCount} request(s)`; });
  es.addEventListener("done", e => { const { result } = JSON.parse(e.data); renderBrief(result.brief); renderClips(result.clips); es.close(); });
  es.addEventListener("error", e => { showError(JSON.parse(e.data)); es.close(); });
  ```
  Progressively renders: download bar → transcript stats → "Analyzing (1 request)…" spinner → brief + ranked moments + `<video controls src="/clips/...">` per clip.

---

## H) MVP Cut Line for a 90-Minute Live Build

**Assumption:** UI takes ~12 minutes and must not be cut. Leaves 78 minutes for engine.

### Must ship (MVP — in order of build)

1. **Project scaffold (5m):** `bun init`, `tsconfig.json` strict, `.gitignore`, `src/config.ts:1` with `MODEL_ID` constant, `src/types.ts:1`, `src/counter.ts:1`.
2. **yt-dlp wrapper (10m):** `src/yt.ts:1` — download + captions, temp dir creation, file discovery. Manual test with a known English-captioned video.
3. **json3 parser (10m):** `src/transcript.ts:1` — pure function + unit test with a tiny hand-crafted json3 fixture. Verify `absoluteMs` formula.
4. **Schema validator (8m):** `src/schema.ts:1` — `unknown` guards, bounds checks, fence stripping. Unit test with good + malformed fixtures.
5. **LLM single request (15m):** `src/llm.ts:1` — one `fetch`, `response_format: json_object`, 429 fallback, 90s timeout, `AbortController`, counter increment. Test with a short transcript and a mocked 429.
6. **ffmpeg cutter (8m):** `src/clip.ts:1` — `spawn` wrapper, `-ss`/`-to`, `copy` then re-encode fallback. Test with a local mp4.
7. **Pipeline orchestration (10m):** `src/pipeline.ts:1` — wires 1–6, emits `ProgressEvent` via `AsyncGenerator`, owns `RequestCounter`, error mapping. Integration test with a short video.
8. **CLI face (5m):** `src/cli.ts:1` — arg parse, event loop, pretty print, exit codes. Manual run `bun src/cli.ts <url>`.
9. **Server face (7m):** `src/server.ts:1` — `Bun.serve`, SSE endpoint, static file serving for `public/index.html` + `/clips/*`.
10. **UI (12m):** `public/index.html:1` — input, `EventSource`, progressive rendering, brief + moments + `<video>` tags, request badge. No bundler, vanilla JS+CSS.

**Total:** ~90m. Buffer is tight; parallelize where possible (e.g., UI scaffold while `yt.ts` is being tested).

### Explicitly deferred (not in MVP)

- Auth, persistence, DB, user accounts.
- Caching of transcripts/results (would save requests but adds complexity; note as follow-up).
- Non-English caption support.
- Auto language detection / translation.
- Clip re-encoding options, thumbnails, waveform.
- Drag-and-drop, paste anywhere, keyboard shortcuts.
- Rate-limit pre-check / daily quota tracking across runs (beyond per-run counter).
- Retry-with-repair for malformed JSON (would cost a second request — deferred until budget allows).
- Tests beyond the two tiny fixtures (parser + validator).
- Docker / deploy, CI.
- Any additional model routes beyond the two fallbacks.
- Analytics, logging to disk, telemetry.

### What "done" looks like at 90m

- `bun src/cli.ts "https://youtube.com/watch?v=..."` prints brief + 3–5 moments and writes `tmp/<id>/clip-*.mp4` playable via `mpv`/`vlc`.
- `bun src/server.ts` → `http://localhost:3000` → paste link → see live progress (download → transcribe → analyze (1 request) → clips) → brief + playable clips in browser.
- `grep -r "fetch" src/` shows exactly one call site (`src/llm.ts:1`).
- `grep -r "OPENROUTER_API_KEY" src/` shows only `src/config.ts:1`.
- `grep -r "any" src/` shows zero (or only justified `unknown` casts with guards).

---

## Build Checklist

1. Scaffold repo: `bun init`, `tsconfig.json` strict, `.gitignore` (`tmp/`, `*.mp4`, `*.json3`, `.env`), `bun.lock` committed, no `package-lock.json`.
2. Create `src/config.ts:1` — `MODEL_ID` + `FALLBACK_MODELS` constants, `getApiKey()` that reads `process.env.OPENROUTER_API_KEY` and throws `MissingKeyError` if absent; verify key is never logged/printed/written.
3. Create `src/types.ts:1` — `ProgressEvent`, `TranscriptWord`, `Transcript`, `Moment`, `DistillResult`, `ClipInfo`, error classes.
4. Create `src/counter.ts:1` — `RequestCounter` with `increment()` called only from `llm.ts`; assert `counter.value <= 3` at pipeline end.
5. Implement `src/yt.ts:1` — `yt-dlp` spawn for video + `--write-auto-sub --sub-lang en --sub-format json3`, temp dir + file discovery, `YtDlpError` / `NoCaptionsError`.
6. Implement `src/transcript.ts:1` — `parseJson3(unknown): Transcript` using `absoluteMs = event.tStartMs + seg.tOffsetMs`, word timing inference, `fullText` + `durationSeconds`; unit test with hand-crafted fixture.
7. Implement `src/schema.ts:1` — `validateDistillResult(unknown, durationSeconds)` with fence stripping, `JSON.parse`, type guards (`unknown` → typed), bounds `15–90s`, `rank` contiguous, no `any`; unit test with good + malformed JSON.
8. Implement `src/llm.ts:1` — single `fetch` to `https://openrouter.ai/api/v1/chat/completions` with `response_format: json_object`, `temperature: 0.2`, 90s `AbortController`, 429 fallback to `FALLBACK_MODELS`, counter increment before each fetch.
9. Implement `src/clip.ts:1` — `ffmpeg -ss start -to end -i input -c copy` with re-encode fallback, per-clip `ClipInfo` result, progress events.
10. Implement `src/pipeline.ts:1` — `async function* run(url)` orchestrating download → transcribe → analyze → clip, emitting `ProgressEvent` with `requestCount`, mapping all errors to typed errors, temp-dir lifecycle.
11. Implement `src/cli.ts:1` — arg parse, `for await` over pipeline events, pretty terminal output, `Requests used: N/1000` summary, `process.exit(1)` on error.
12. Implement `src/server.ts:1` — `Bun.serve`, `GET /` → `public/index.html`, `GET /api/distill?url=` → SSE (`text/event-stream`) forwarding pipeline events, `GET /clips/*` static serving.
13. Build `public/index.html:1` — single file, no bundler: URL input, `EventSource` consumer, progressive phase rendering, brief + ranked moments + `<video controls>` clips, request-count badge (12m, do not cut).
14. Verify invariants: `grep -r "fetch" src/` → one site; `grep -r "OPENROUTER_API_KEY" src/` → one file; `grep -r "\bany\b" src/` → zero; `bun tsc --noEmit` passes strict.
15. Manual end-to-end test: CLI with a 5-minute captioned video → 1 request, brief + 3–5 clips playable; then server → browser paste same URL → SSE progress → same result.
16. Failure-path smoke tests: missing key, bad URL, no-captions video, mocked 429 (fallback), mocked timeout, malformed JSON fixture — all surface typed errors without extra model spend.
