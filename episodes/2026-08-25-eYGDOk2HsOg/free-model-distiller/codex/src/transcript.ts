import { DistillerError } from "./errors.ts";
import type { Transcript, TranscriptCue, TranscriptWord } from "./types.ts";

interface ParsedWord {
  text: string;
  startMs: number;
  eventEndMs: number | undefined;
  eventIndex: number;
  segmentIndex: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNonNegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseJson3(value: unknown): Transcript {
  if (!isRecord(value) || !Array.isArray(value.events)) {
    throw new DistillerError("TRANSCRIPT_INVALID", "json3 must contain an events array");
  }

  const parsedWords: ParsedWord[] = [];
  const cues: TranscriptCue[] = [];
  let maximumEventEnd = 0;

  for (let eventIndex = 0; eventIndex < value.events.length; eventIndex += 1) {
    const event = value.events[eventIndex];
    if (!isRecord(event) || !Array.isArray(event.segs)) continue;

    const eventStart = finiteNonNegative(event.tStartMs);
    if (eventStart === undefined) continue;
    const eventDuration = finiteNonNegative(event.dDurationMs);
    const eventEnd = eventDuration === undefined ? undefined : eventStart + eventDuration;
    if (eventEnd !== undefined) maximumEventEnd = Math.max(maximumEventEnd, eventEnd);

    const rawCueParts: string[] = [];
    const eventWordStarts: number[] = [];

    for (let segmentIndex = 0; segmentIndex < event.segs.length; segmentIndex += 1) {
      const segment = event.segs[segmentIndex];
      if (!isRecord(segment) || typeof segment.utf8 !== "string") continue;

      rawCueParts.push(segment.utf8);
      const text = normalizeWhitespace(segment.utf8);
      if (text === "") continue;

      const offset = finiteNonNegative(segment.tOffsetMs) ?? 0;
      const startMs = eventStart + offset;
      eventWordStarts.push(startMs);
      parsedWords.push({ text, startMs, eventEndMs: eventEnd, eventIndex, segmentIndex });
    }

    const cueText = normalizeWhitespace(rawCueParts.join(""));
    if (cueText !== "" && eventWordStarts.length > 0) {
      const cueStart = Math.min(...eventWordStarts);
      cues.push({
        text: cueText,
        startMs: cueStart,
        endMs: eventEnd !== undefined && eventEnd > cueStart ? eventEnd : cueStart + 250,
      });
    }
  }

  if (parsedWords.length === 0) {
    throw new DistillerError(
      "NO_ENGLISH_CAPTIONS",
      "The English json3 file contains no usable caption words",
    );
  }

  parsedWords.sort(
    (left, right) =>
      left.startMs - right.startMs ||
      left.eventIndex - right.eventIndex ||
      left.segmentIndex - right.segmentIndex,
  );
  cues.sort((left, right) => left.startMs - right.startMs);

  const words: TranscriptWord[] = parsedWords.map((word, index) => {
    let nextInEvent: number | undefined;
    let nextGlobal: number | undefined;
    for (let nextIndex = index + 1; nextIndex < parsedWords.length; nextIndex += 1) {
      const candidate = parsedWords[nextIndex];
      if (candidate === undefined || candidate.startMs <= word.startMs) continue;
      nextGlobal = candidate.startMs;
      if (candidate.eventIndex === word.eventIndex) nextInEvent = candidate.startMs;
      break;
    }

    const endMs =
      nextInEvent ??
      (word.eventEndMs !== undefined && word.eventEndMs > word.startMs
        ? word.eventEndMs
        : undefined) ??
      nextGlobal ??
      word.startMs + 250;

    return { text: word.text, startMs: word.startMs, endMs };
  });

  const maximumWordEnd = Math.max(...words.map((word) => word.endMs));
  const durationSeconds = Math.max(1, Math.ceil(Math.max(maximumEventEnd, maximumWordEnd) / 1_000));
  return {
    words,
    cues,
    fullText: cues.map((cue) => cue.text).join(" "),
    durationSeconds,
  };
}

function timestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(milliseconds % 1_000);
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":") + `.${String(millis).padStart(3, "0")}`;
}

export function formatTranscript(transcript: Transcript): string {
  return transcript.cues
    .map(
      (cue) =>
        `[${timestamp(cue.startMs)}–${timestamp(cue.endMs)}] ${cue.text}`,
    )
    .join("\n");
}
