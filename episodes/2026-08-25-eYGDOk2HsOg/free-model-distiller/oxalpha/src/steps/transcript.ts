import { SEGMENT_GAP_MS } from "../config";
import { ValidationError, type Json3, type Segment, type Word } from "../types";

export function isJson3(v: unknown): v is Json3 {
  if (typeof v !== "object" || v === null) return false;
  const events = (v as Record<string, unknown>)["events"];
  if (!Array.isArray(events)) return false;
  return events.every(
    (e) =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>)["tStartMs"] === "number" &&
      (!("segs" in e) || Array.isArray((e as Record<string, unknown>)["segs"])),
  );
}

export function parseJson3(raw: string): Word[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ValidationError("captions file is not valid JSON");
  }
  if (!isJson3(data)) throw new ValidationError("captions file does not match json3 shape");

  const words: Word[] = [];
  const seen = new Set<string>();
  for (const ev of data.events) {
    if (!ev.segs) continue;
    for (const seg of ev.segs) {
      const text = seg.utf8.replace(/\n/g, " ").trim();
      if (!text) continue;
      const startMs = Math.round(ev.tStartMs + (seg.tOffsetMs ?? 0));
      // auto-caption roll-up: same word repeated at shifted offsets; keep first occurrence per key
      const key = `${text}@${Math.round(startMs / 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ text, startMs });
    }
  }
  if (words.length === 0) throw new ValidationError("captions parsed to zero words");
  return words.sort((a, b) => a.startMs - b.startMs);
}

function endsSentence(text: string): boolean {
  return /[.!?]["')\]]?$/.test(text);
}

export function groupSegments(words: Word[]): Segment[] {
  const segments: Segment[] = [];
  let current: Word[] = [];
  for (const w of words) {
    current.push(w);
    const gap = segments.length >= 0 && current.length > 1 ? w.startMs - current[current.length - 2]!.startMs : 0;
    if (endsSentence(w.text) || gap > SEGMENT_GAP_MS) {
      flush(current, segments);
      current = [];
    }
  }
  if (current.length > 0) flush(current, segments);
  return segments;
}

function flush(words: Word[], out: Segment[]): void {
  if (words.length === 0) return;
  out.push({
    text: words.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim(),
    startMs: words[0]!.startMs,
    endMs: words[words.length - 1]!.startMs,
  });
}

export function formatTs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function renderTranscript(segments: Segment[]): string {
  return segments.map((s) => `[${formatTs(s.startMs)}] ${s.text}`).join("\n");
}

export function buildTranscript(captionsRaw: string): { transcript: string; segments: Segment[]; wordCount: number } {
  const words = parseJson3(captionsRaw);
  const segments = groupSegments(words);
  return { transcript: renderTranscript(segments), segments, wordCount: words.length };
}
