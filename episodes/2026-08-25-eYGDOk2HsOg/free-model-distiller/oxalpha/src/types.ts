export type Step =
  | "preflight"
  | "captions"
  | "download"
  | "transcript"
  | "analyze"
  | "cut";

export interface Json3Seg {
  utf8: string;
  tOffsetMs?: number;
}

export interface Json3Event {
  tStartMs: number;
  segs?: Json3Seg[];
}

export interface Json3 {
  events: Json3Event[];
}

export interface Word {
  text: string;
  startMs: number;
}

export interface Segment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface Moment {
  rank: number;
  startSeconds: number;
  endSeconds: number;
  title: string;
  reason: string;
}

export interface AnalyzedResult {
  brief: string;
  moments: Moment[];
}

export interface ClipInfo {
  index: number;
  title: string;
  reason: string;
  startSeconds: number;
  endSeconds: number;
  file: string;
}

export type ProgressEvent =
  | { type: "run:start"; url: string; videoId: string }
  | { type: "step:start"; step: Step }
  | { type: "progress"; step: Step; message: string; percent?: number }
  | { type: "request:start"; model: string }
  | {
      type: "request:end";
      model: string;
      ok: boolean;
      ms: number;
      runRequests: number;
      today: number;
      minute: number;
    }
  | { type: "request:fallback"; from: string; to: string; cause: "429" | "timeout" }
  | { type: "brief:done"; brief: string; momentCount: number }
  | { type: "moment:done"; index: number; title: string; file: string }
  | { type: "done"; clips: ClipInfo[] }
  | { type: "error"; step?: Step; message: string; fatal: boolean };

export class ShellError extends Error {
  constructor(
    public cmd: string,
    public exitCode: number,
    public stderrTail: string,
  ) {
    super(`command failed (${exitCode}): ${cmd}\n${stderrTail}`);
    this.name = "ShellError";
  }
}

export class RateLimitError extends Error {
  constructor(public model: string, public retryAfterMs?: number) {
    super(`rate limited: ${model}`);
    this.name = "RateLimitError";
  }
}

export class TimeoutError extends Error {
  constructor(public model: string) {
    super(`timeout: ${model}`);
    this.name = "TimeoutError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
