import { MAX_CLIPS } from "../config";
import { chat, getApiKey } from "../lib/openrouter";
import type { Budget } from "../lib/budget";
import {
  RateLimitError,
  TimeoutError,
  type ProgressEvent,
  type AnalyzedResult,
} from "../types";
import { MODEL_ID, FALLBACK_MODELS } from "../config";
import { extractJson, validateAnalyzed } from "../validate";

const SYSTEM_PROMPT = `You are a precise video analyst. You receive a timestamped transcript of a YouTube video.
Respond with ONLY a JSON object, no markdown fences, no prose, matching exactly:
{"brief":"<=150 words on what the video actually covers","moments":[{"rank":1,"startSeconds":0,"endSeconds":0,"title":"hook-style title <=80 chars","reason":"one sentence why this moment is worth watching"}]}
Rules: 3 to 5 moments, ranked best first. endSeconds > startSeconds. Each moment between 15 and 90 seconds.
All timestamps within the video duration. startSeconds must correspond to a timestamp present in the transcript.`;

export async function analyze(
  transcript: string,
  durationSeconds: number,
  budget: Budget,
  emit: (e: ProgressEvent) => void,
  apiKey: string,
): Promise<AnalyzedResult> {
  const userContent = `The video is ${Math.floor(durationSeconds / 60)} minutes ${Math.round(durationSeconds % 60)} seconds long.\n\n${transcript}`;
  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userContent },
  ];

  const chain = [MODEL_ID, ...FALLBACK_MODELS];
  let lastError: Error | null = null;

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i]!;
    emit({ type: "request:start", model });
    const t0 = performance.now();
    try {
      const raw = await chat(model, messages, apiKey);
      const snap = budget.record();
      emit({
        type: "request:end",
        model,
        ok: true,
        ms: Math.round(performance.now() - t0),
        ...snap,
      });
      const validated = validateAnalyzed(extractJson(raw), durationSeconds);
      return validated;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastError = err;
      if (e instanceof RateLimitError || e instanceof TimeoutError) {
        const cause: "429" | "timeout" = e instanceof RateLimitError ? "429" : "timeout";
        const next = chain[i + 1];
        if (e instanceof RateLimitError && e.retryAfterMs && e.retryAfterMs > 0 && e.retryAfterMs < 30_000) {
          await Bun.sleep(e.retryAfterMs);
        }
        if (next) {
          emit({ type: "request:fallback", from: model, to: next, cause });
          continue;
        }
      }
      throw lastError;
    }
  }
  throw lastError ?? new Error("model chain exhausted");
}

export function ensureApiKey(): string {
  return getApiKey();
}

export const MAX_MOMENTS = MAX_CLIPS;
