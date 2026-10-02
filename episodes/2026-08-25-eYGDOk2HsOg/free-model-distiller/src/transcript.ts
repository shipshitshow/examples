import { TranscriptParseError, NoCaptionsError, type Transcript, type TranscriptWord } from "./types.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseJson3(raw: unknown): Transcript {
  if (!isRecord(raw) || !Array.isArray((raw as Record<string, unknown>).events)) {
    throw new TranscriptParseError("json3 missing events array");
  }
  const events = (raw as { events: unknown[] }).events;
  const words: TranscriptWord[] = [];

  for (const ev of events) {
    if (!isRecord(ev)) continue;
    const tStartMs = ev.tStartMs;
    const dDurationMs = ev.dDurationMs;
    const segs = ev.segs;
    if (typeof tStartMs !== "number") continue;
    if (!Array.isArray(segs)) continue; // header events have no segs
    const dur = typeof dDurationMs === "number" ? dDurationMs : 0;

    for (const seg of segs) {
      if (!isRecord(seg)) continue;
      const utf8 = seg.utf8;
      const tOffsetMs = seg.tOffsetMs;
      if (typeof utf8 !== "string") continue;
      const trimmed = utf8.trim();
      if (trimmed.length === 0) continue;
      const offset = typeof tOffsetMs === "number" ? tOffsetMs : 0;
      const absoluteMs = tStartMs + offset;
      words.push({ text: trimmed, startMs: absoluteMs, endMs: absoluteMs });
    }
    // fix endMs for words in this event: last word's end = tStartMs + dDurationMs
    // we patch after loop by using next word's start
    void dur;
  }

  if (words.length === 0) throw new NoCaptionsError("json3 had no usable words");

  // sort just in case
  words.sort((a, b) => a.startMs - b.startMs);

  // infer endMs: next word's start, last word uses last event's end or +2000ms fallback
  for (let i = 0; i < words.length; i++) {
    const cur = words[i];
    if (!cur) continue;
    const nxt = words[i + 1];
    if (nxt) cur.endMs = nxt.startMs;
    else cur.endMs = cur.startMs + 2000;
  }

  // validate monotonic
  for (let i = 1; i < words.length; i++) {
    const prev = words[i - 1];
    const cur = words[i];
    if (!prev || !cur) continue;
    if (cur.startMs < prev.startMs) throw new TranscriptParseError("words not monotonic");
  }

  const fullText = words.map((w) => w.text).join(" ");
  const last = words[words.length - 1];
  if (!last) throw new TranscriptParseError("empty words after processing");
  const durationSeconds = Math.ceil(last.endMs / 1000);

  if (durationSeconds <= 0) throw new TranscriptParseError("invalid duration");

  return { words, fullText, durationSeconds };
}

export function formatTranscriptForLLM(t: Transcript): string {
  // chunk into ~30s lines with [mm:ss] anchors
  const lines: string[] = [];
  let bucket: string[] = [];
  let bucketStart = 0;
  const flush = (startMs: number) => {
    if (bucket.length === 0) return;
    const mm = String(Math.floor(startMs / 60000)).padStart(2, "0");
    const ss = String(Math.floor((startMs % 60000) / 1000)).padStart(2, "0");
    lines.push(`[${mm}:${ss}] ${bucket.join(" ")}`);
    bucket = [];
  };
  for (const w of t.words) {
    if (bucket.length === 0) bucketStart = w.startMs;
    bucket.push(w.text);
    // approx 30s or ~60 words
    if (w.startMs - bucketStart >= 30000 || bucket.length >= 80) {
      flush(bucketStart);
    }
  }
  flush(bucketStart);
  let out = lines.join("\n");
  // truncate if huge (>800k chars)
  if (out.length > 800_000) {
    const half = 400_000;
    out = out.slice(0, half) + "\n[…truncated middle…]\n" + out.slice(-half);
  }
  return out;
}
