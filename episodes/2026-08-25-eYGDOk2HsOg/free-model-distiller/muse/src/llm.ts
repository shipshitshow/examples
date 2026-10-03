import { MODEL_ID, FALLBACK_MODELS, getApiKey } from "./config.ts";
import { RateLimitedError, ModelTimeoutError } from "./types.ts";
import type { RequestCounter } from "./counter.ts";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 90_000;

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function parseRetryAfter(h: string | null): number | undefined {
  if (!h) return undefined;
  const n = Number(h);
  if (Number.isFinite(n)) return n;
  const date = Date.parse(h);
  if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - Date.now()) / 1000));
  return undefined;
}

export async function callLLM(transcriptText: string, durationSeconds: number, counter: RequestCounter): Promise<string> {
  const apiKey = getApiKey();

  const system = "You are a YouTube distiller. You receive a full English transcript with [mm:ss] anchors. Return ONLY valid JSON matching the provided schema. No prose outside JSON, no markdown fences. English only. Moments must be within transcript duration, non-overlapping preferred, each 15-90s.";
  const user = `Transcript duration: ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")} (${durationSeconds}s), transcript below.\nTranscript:\n${transcriptText}\n\nTask: produce JSON with:\n- brief: 3-6 sentence summary of what the video actually covers (not generic hype).\n- moments: 3-5 ranked highlights, each with startSeconds, endSeconds, title (hook, <=60 chars), reason (1 sentence, why worth watching).\n\nRules:\n- startSeconds/endSeconds are integers, 0 <= start < end <= ${durationSeconds}, duration 15-90s.\n- Sorted by rank 1..N (1 = best).\n- No overlapping moments preferred; if overlap unavoidable, keep <5s overlap.\n- Return ONLY the JSON object matching schema: { brief: string, moments: [{ rank, title, reason, startSeconds, endSeconds }] }`;

  const models = [MODEL_ID, ...FALLBACK_MODELS];
  let last429RetryAfter: number | undefined;

  for (let idx = 0; idx < models.length; idx++) {
    const model = models[idx];
    if (!model) continue;

    counter.increment();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/openrouterfree",
          "X-Title": "YouTube Distiller",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      clearTimeout(timeout);
      const err = e as Error;
      if (err.name === "AbortError") throw new ModelTimeoutError(`Model ${model} timed out after ${TIMEOUT_MS / 1000}s`);
      throw e;
    }
    clearTimeout(timeout);

    if (res.status === 429) {
      last429RetryAfter = parseRetryAfter(res.headers.get("Retry-After"));
      // try next fallback when available
      if (idx < models.length - 1) {
        if (last429RetryAfter && last429RetryAfter > 0 && last429RetryAfter < 10) await sleep(last429RetryAfter * 1000);
        continue;
      }
      throw new RateLimitedError(`Free tier throttled (429) on all models. Try again in ${last429RetryAfter ?? 30}s or switch MODEL_ID in src/config.ts:1`, last429RetryAfter);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenRouter error ${res.status} on ${model}: ${body.slice(0, 800)}`);
    }

    const json = await res.json() as unknown;
    // extract content: { choices: [{ message: { content: string } }] }
    if (typeof json !== "object" || json === null) throw new Error("Invalid OpenRouter response");
    const choices = (json as { choices?: unknown[] }).choices;
    if (!Array.isArray(choices) || choices.length === 0) throw new Error("No choices in OpenRouter response");
    const first = choices[0] as { message?: { content?: unknown } };
    const content = first?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) throw new Error("Empty model content");
    return content;
  }

  throw new RateLimitedError("All models throttled (429)", last429RetryAfter);
}
