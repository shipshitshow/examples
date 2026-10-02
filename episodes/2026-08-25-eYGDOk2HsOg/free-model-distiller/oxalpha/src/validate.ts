import { MIN_CLIP_SECONDS, MAX_CLIP_SECONDS, MIN_MOMENTS } from "./config";
import { ValidationError, type Moment, type AnalyzedResult } from "./types";

export function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = t.indexOf("{");
  if (start === -1) throw new ValidationError("no JSON object found in model output");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === "\\") {
      esc = true;
      continue;
    }
    if (c === '"') inStr = !inStr;
    if (inStr) continue;
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(t.slice(start, i + 1)) as unknown;
      }
    }
  }
  throw new ValidationError("unterminated JSON object in model output");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

export function validateAnalyzed(raw: unknown, durationSeconds: number): AnalyzedResult {
  if (!isRecord(raw)) throw new ValidationError("top level is not an object");
  const brief = raw["brief"];
  const momentsRaw = raw["moments"];
  if (typeof brief !== "string" || brief.trim().length === 0) {
    throw new ValidationError("missing 'brief' string");
  }
  if (!Array.isArray(momentsRaw)) throw new ValidationError("'moments' is not an array");

  const moments: Moment[] = [];
  for (const m of momentsRaw) {
    if (!isRecord(m)) continue;
    const rank = num(m["rank"]);
    const start = num(m["startSeconds"]);
    const end = num(m["endSeconds"]);
    const title = m["title"];
    const reason = m["reason"];
    if (rank === null || start === null || end === null) continue;
    if (typeof title !== "string" || title.trim() === "") continue;
    if (typeof reason !== "string" || reason.trim() === "") continue;

    let s = Math.max(0, Math.round(start));
    let e = Math.round(end);
    if (s > durationSeconds) continue;
    e = Math.min(e, Math.floor(durationSeconds));

    // clamp-and-fix: enforce duration bounds locally instead of rejecting outright
    if (e - s > MAX_CLIP_SECONDS) e = s + MAX_CLIP_SECONDS;
    if (e - s < MIN_CLIP_SECONDS) {
      e = s + MIN_CLIP_SECONDS;
      if (e > durationSeconds) {
        s = Math.max(0, Math.floor(durationSeconds) - MIN_CLIP_SECONDS);
        e = Math.floor(durationSeconds);
      }
      if (e - s < MIN_CLIP_SECONDS) continue;
    }

    moments.push({
      rank,
      startSeconds: s,
      endSeconds: e,
      title: title.trim().slice(0, 80),
      reason: reason.trim(),
    });
  }

  moments.sort((a, b) => a.rank - b.rank);
  const capped = moments.slice(0, 5);
  capped.forEach((m, i) => (m.rank = i + 1));
  if (capped.length < MIN_MOMENTS) {
    throw new ValidationError(
      `only ${capped.length} valid moment(s), need ${MIN_MOMENTS}`,
    );
  }
  return { brief: brief.trim(), moments: capped };
}
