import { ValidationError, type DistillResult, type Moment } from "./types.ts";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    t = t.replace(/\s*```$/g, "");
    t = t.trim();
  }
  return t;
}

export function validateDistillResult(raw: unknown, durationSeconds: number): DistillResult {
  const issues: string[] = [];

  let text: string;
  if (typeof raw === "string") {
    text = stripFences(raw);
  } else {
    issues.push("model content is not a string");
    throw new ValidationError("Model returned invalid JSON", issues);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    issues.push("invalid JSON — expected strict JSON object");
    issues.push(text.slice(0, 500));
    throw new ValidationError("Model returned invalid JSON", issues);
  }

  if (!isRecord(parsed)) {
    issues.push("top-level must be object");
    throw new ValidationError("Validation failed", issues);
  }

  const brief = parsed.brief;
  if (typeof brief !== "string" || brief.trim().length < 80) issues.push("brief must be string >=80 chars");
  if (typeof brief === "string" && brief.length > 800) issues.push("brief must be <=800 chars");

  const momentsRaw = parsed.moments;
  if (!Array.isArray(momentsRaw)) {
    issues.push("moments must be array");
    throw new ValidationError("Validation failed", issues);
  }
  if (momentsRaw.length < 3 || momentsRaw.length > 5) issues.push("moments must have 3-5 items");

  // helper: coerce numeric strings/floats to integer seconds (model often returns floats like 12.5)
  const coerceInt = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v.trim());
      if (Number.isFinite(n)) return Math.round(n);
    }
    return null;
  };

  const moments: Moment[] = [];
  for (let i = 0; i < momentsRaw.length; i++) {
    const m = momentsRaw[i];
    if (!isRecord(m)) { issues.push(`moments[${i}] must be object`); continue; }
    const rankRaw = m.rank;
    const title = m.title;
    const reason = m.reason;
    const startRaw = m.startSeconds;
    const endRaw = m.endSeconds;

    const rank = coerceInt(rankRaw);
    const startSeconds = coerceInt(startRaw);
    const endSeconds = coerceInt(endRaw);

    if (rank === null || rank < 1 || rank > 5) issues.push(`moments[${i}].rank must be integer 1..5`);
    if (typeof title !== "string" || title.trim().length < 5) issues.push(`moments[${i}].title must be string >=5 chars`);
    if (typeof title === "string" && title.length > 60) issues.push(`moments[${i}].title must be <=60 chars`);
    if (typeof reason !== "string" || reason.trim().length < 10) issues.push(`moments[${i}].reason must be string >=10 chars`);
    if (typeof reason === "string" && reason.length > 200) issues.push(`moments[${i}].reason must be <=200 chars`);
    if (startSeconds === null || startSeconds < 0) issues.push(`moments[${i}].startSeconds must be integer >=0`);
    if (endSeconds === null || endSeconds < 1) issues.push(`moments[${i}].endSeconds must be integer >=1`);

    if (startSeconds !== null && endSeconds !== null) {
      if (startSeconds >= endSeconds) issues.push(`moments[${i}]: startSeconds must be < endSeconds`);
      const dur = endSeconds - startSeconds;
      if (dur < 15 || dur > 90) issues.push(`moments[${i}]: duration must be 15..90s (got ${dur})`);
      if (endSeconds > durationSeconds) issues.push(`moments[${i}]: endSeconds ${endSeconds} exceeds duration ${durationSeconds}`);
      if (startSeconds > durationSeconds) issues.push(`moments[${i}]: startSeconds exceeds duration`);
    }

    if (rank !== null && typeof title === "string" && typeof reason === "string" && startSeconds !== null && endSeconds !== null) {
      moments.push({ rank, title: title.trim(), reason: reason.trim(), startSeconds, endSeconds });
    }
  }

  // rank contiguous 1..N
  if (moments.length > 0) {
    const sorted = [...moments].sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];
      if (!m) continue;
      if (m.rank !== i + 1) issues.push(`ranks must be contiguous 1..${moments.length} (found ${m.rank} at position ${i})`);
    }
  }

  if (issues.length > 0) throw new ValidationError("Validation failed", issues);

  // sort by rank for consumers
  moments.sort((a, b) => a.rank - b.rank);

  const briefStr = parsed.brief as string;
  return { brief: briefStr.trim(), moments };
}
