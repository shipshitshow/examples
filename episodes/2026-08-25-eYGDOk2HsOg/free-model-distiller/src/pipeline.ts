import { mkdir, readFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getApiKey } from "./config.ts";
import { RequestCounter } from "./counter.ts";
import { downloadVideoAndCaptions } from "./yt.ts";
import { parseJson3, formatTranscriptForLLM } from "./transcript.ts";
import { callLLM } from "./llm.ts";
import { validateDistillResult } from "./schema.ts";
import { cutClips } from "./clip.ts";
import type { ProgressEvent, DistillResult } from "./types.ts";

function now(): number { return Date.now(); }

export async function* runPipeline(url: string, opts?: { tmpBase?: string }): AsyncGenerator<ProgressEvent> {
  const counter = new RequestCounter();
  const runId = randomUUID().slice(0, 8);
  const tmpBase = opts?.tmpBase ?? join(process.cwd(), "tmp");
  const tmpDir = join(tmpBase, runId);
  await mkdir(tmpDir, { recursive: true });

  const emit = (e: Omit<ProgressEvent, "requestCount" | "timestamp">): ProgressEvent => ({
    ...e,
    requestCount: counter.value,
    timestamp: now(),
  });

  // early key check — fail fast, 0 requests
  try { getApiKey(); } catch (e: unknown) {
    const err = e as Error;
    yield emit({ phase: "download", status: "error", message: err.message, error: { code: err.name, details: err.message } });
    return;
  }

  // 1) download
  yield emit({ phase: "download", status: "start", message: "Fetching video + captions via yt-dlp…" });
  let videoPath: string;
  let json3Path: string;
  try {
    const dl = await downloadVideoAndCaptions(url, tmpDir);
    videoPath = dl.videoPath;
    json3Path = dl.json3Path;
    yield emit({ phase: "download", status: "done", message: `Download done — video + captions in tmp/${runId}/` });
  } catch (e: unknown) {
    const err = e as Error;
    yield emit({ phase: "download", status: "error", message: err.message, error: { code: err.name, details: err.message } });
    return;
  }

  // 2) transcribe (local)
  yield emit({ phase: "transcribe", status: "start", message: "Parsing json3 into word-timed transcript…" });
  let transcript;
  try {
    const rawText = await readFile(json3Path, "utf-8");
    const raw = JSON.parse(rawText) as unknown;
    transcript = parseJson3(raw);
    yield emit({ phase: "transcribe", status: "done", message: `Transcript: ${transcript.words.length} words, ${transcript.durationSeconds}s` });
  } catch (e: unknown) {
    const err = e as Error;
    yield emit({ phase: "transcribe", status: "error", message: err.message, error: { code: err.name, details: err.message } });
    return;
  }

  // 3) analyze — ONE request
  yield emit({ phase: "analyze", status: "start", message: `Analyzing transcript — 1 request (may fallback on 429)…` });
  let result: DistillResult;
  try {
    const formatted = formatTranscriptForLLM(transcript);
    const content = await callLLM(formatted, transcript.durationSeconds, counter);
    // counter.value should be 1..3 at this point
    result = validateDistillResult(content, transcript.durationSeconds);
    yield emit({ phase: "analyze", status: "done", message: `Analysis done — brief + ${result.moments.length} moments (${counter.value} request(s) used)` });
  } catch (e: unknown) {
    const err = e as Error & { issues?: string[]; retryAfterSeconds?: number };
    const issues = (err as { issues?: string[] }).issues;
    const retryAfter = (err as { retryAfterSeconds?: number }).retryAfterSeconds;
    yield emit({
      phase: "analyze",
      status: "error",
      message: err.message,
      error: { code: err.name, details: err.message, retryAfterSeconds: retryAfter, issues },
    });
    return;
  }

  if (counter.value > 3) {
    // invariant warning but not fatal
    console.error(`[warn] request counter ${counter.value} exceeds 3 — check llm.ts for extra calls`);
  }

  // 4) clip
  yield emit({ phase: "clip", status: "start", message: `Cutting ${result.moments.length} clips with ffmpeg…` });
  const clipsDir = join(tmpDir, "clips");
  await mkdir(clipsDir, { recursive: true });
  try {
    const clips = await cutClips(videoPath, result.moments, clipsDir);
    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      if (!c) continue;
      yield emit({
        phase: "clip",
        status: "progress",
        message: `Clip ${i + 1}/${clips.length} "${c.title}" [${c.startSeconds}–${c.endSeconds}] ${c.ok ? "ok" : "failed"}`,
        percent: Math.round(((i + 1) / clips.length) * 100),
      });
    }
    yield emit({ phase: "clip", status: "done", message: `Clips done — ${clips.filter((c) => c.ok).length}/${clips.length} ok` });
    yield emit({
      phase: "done",
      status: "done",
      message: `Done — ${result.moments.length} clips in tmp/${runId}/clips/ — ${counter.budgetString()}`,
      result: { ...result, clips, durationSeconds: transcript.durationSeconds },
    });
  } catch (e: unknown) {
    const err = e as Error;
    yield emit({ phase: "clip", status: "error", message: err.message, error: { code: err.name, details: err.message } });
    return;
  }
}
