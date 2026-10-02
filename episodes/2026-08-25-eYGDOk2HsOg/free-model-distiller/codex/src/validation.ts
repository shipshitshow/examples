import { DistillerError } from "./errors.ts";
import type { Distillation, Moment } from "./types.ts";

const TOP_LEVEL_KEYS = new Set(["brief", "moments"]);
const MOMENT_KEYS = new Set([
  "rank",
  "title",
  "reason",
  "startSeconds",
  "endSeconds",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unexpectedKeys(value: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function boundedString(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  issues: string[],
): string | undefined {
  if (typeof value !== "string") {
    issues.push(`${path} must be a string`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length < minimum || trimmed.length > maximum) {
    issues.push(`${path} must contain ${minimum}–${maximum} characters`);
    return undefined;
  }
  return trimmed;
}

function integer(value: unknown, path: string, issues: string[]): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.push(`${path} must be an integer`);
    return undefined;
  }
  return value;
}

export function validateModelOutput(content: string, durationSeconds: number): Distillation {
  let candidate = content.replace(/^\uFEFF/, "").trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(candidate);
  if (fenced?.[1] !== undefined) candidate = fenced[1].trim();
  candidate = candidate.replace(/^<think>[\s\S]*?<\/think>\s*/i, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const possibleObject = candidate.slice(firstBrace, lastBrace + 1);
      try {
        parsed = JSON.parse(possibleObject);
      } catch {
        parsed = undefined;
      }
    }
  }

  if (parsed === undefined) {
    const preview = content.trim().replace(/\s+/g, " ").slice(0, 160);
    throw new DistillerError("MODEL_OUTPUT_INVALID", "The model did not return strict JSON", {
      issues: [
        "response did not contain one parseable JSON object",
        ...(preview === "" ? [] : [`response preview: ${preview}`]),
      ],
    });
  }

  const issues: string[] = [];
  if (!isRecord(parsed)) {
    throw new DistillerError("MODEL_OUTPUT_INVALID", "The model response has the wrong shape", {
      issues: ["top level must be an object"],
    });
  }

  const extraTopLevelKeys = unexpectedKeys(parsed, TOP_LEVEL_KEYS);
  if (extraTopLevelKeys.length > 0) {
    issues.push(`unexpected top-level keys: ${extraTopLevelKeys.join(", ")}`);
  }
  const brief = boundedString(parsed.brief, "brief", 80, 1_200, issues);

  if (!Array.isArray(parsed.moments)) {
    issues.push("moments must be an array");
  }
  const rawMoments = Array.isArray(parsed.moments) ? parsed.moments : [];
  if (rawMoments.length !== 3) {
    issues.push(`moments must contain exactly 3 items; received ${rawMoments.length}`);
  }

  const moments: Moment[] = [];
  for (let index = 0; index < rawMoments.length; index += 1) {
    const rawMoment = rawMoments[index];
    const path = `moments[${index}]`;
    if (!isRecord(rawMoment)) {
      issues.push(`${path} must be an object`);
      continue;
    }
    const extras = unexpectedKeys(rawMoment, MOMENT_KEYS);
    if (extras.length > 0) issues.push(`${path} has unexpected keys: ${extras.join(", ")}`);

    const rank = integer(rawMoment.rank, `${path}.rank`, issues);
    const startSeconds = integer(rawMoment.startSeconds, `${path}.startSeconds`, issues);
    const endSeconds = integer(rawMoment.endSeconds, `${path}.endSeconds`, issues);
    const title = boundedString(rawMoment.title, `${path}.title`, 4, 80, issues);
    const reason = boundedString(rawMoment.reason, `${path}.reason`, 8, 240, issues);

    if (rank !== undefined && rank !== index + 1) {
      issues.push(`${path}.rank must be ${index + 1}`);
    }
    if (startSeconds !== undefined && startSeconds < 0) {
      issues.push(`${path}.startSeconds must be at least 0`);
    }
    if (startSeconds !== undefined && endSeconds !== undefined) {
      const clipDuration = endSeconds - startSeconds;
      if (startSeconds >= endSeconds) issues.push(`${path} must have startSeconds < endSeconds`);
      if (endSeconds > durationSeconds) issues.push(`${path}.endSeconds exceeds the transcript duration`);
      if (clipDuration < 15 || clipDuration > 90) {
        issues.push(`${path} must be between 15 and 90 seconds long`);
      }
    }

    if (
      rank !== undefined &&
      startSeconds !== undefined &&
      endSeconds !== undefined &&
      title !== undefined &&
      reason !== undefined
    ) {
      moments.push({ rank, title, reason, startSeconds, endSeconds });
    }
  }

  if (issues.length > 0 || brief === undefined || moments.length !== rawMoments.length) {
    throw new DistillerError("MODEL_OUTPUT_INVALID", "The model response failed validation", {
      issues,
    });
  }
  return { brief, moments };
}
