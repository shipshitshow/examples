export type PipelinePhase = "download" | "transcribe" | "analyze" | "clip" | "done";

export type ProgressStatus = "start" | "progress" | "done" | "error";

export interface ClipInfo {
  rank: number;
  title: string;
  path: string;
  startSeconds: number;
  endSeconds: number;
  ok: boolean;
  error?: string;
}

export interface DistillResult {
  brief: string;
  moments: Moment[];
}

export interface Moment {
  rank: number;
  title: string;
  reason: string;
  startSeconds: number;
  endSeconds: number;
}

export interface ProgressEvent {
  phase: PipelinePhase;
  status: ProgressStatus;
  message: string;
  percent?: number;
  requestCount: number;
  timestamp: number;
  result?: DistillResult & { clips: ClipInfo[]; durationSeconds: number };
  error?: { code: string; details?: string; retryAfterSeconds?: number; issues?: string[] };
}

export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface Transcript {
  words: TranscriptWord[];
  fullText: string;
  durationSeconds: number;
}

// Typed errors
export class YtDlpError extends Error {
  constructor(message: string) { super(message); this.name = "YtDlpError"; }
}
export class NoCaptionsError extends Error {
  constructor(message = "No English auto-captions found") { super(message); this.name = "NoCaptionsError"; }
}
export class TranscriptParseError extends Error {
  constructor(message: string) { super(message); this.name = "TranscriptParseError"; }
}
export class ValidationError extends Error {
  issues: string[];
  constructor(message: string, issues: string[]) { super(message); this.name = "ValidationError"; this.issues = issues; }
}
export class RateLimitedError extends Error {
  retryAfterSeconds?: number;
  constructor(message: string, retryAfter?: number) { super(message); this.name = "RateLimitedError"; this.retryAfterSeconds = retryAfter; }
}
export class ModelTimeoutError extends Error {
  constructor(message = "Model request timed out") { super(message); this.name = "ModelTimeoutError"; }
}
export class ClipError extends Error {
  constructor(message: string) { super(message); this.name = "ClipError"; }
}
