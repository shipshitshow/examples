export type PipelinePhase =
  | "preflight"
  | "download"
  | "transcript"
  | "analyze"
  | "clip"
  | "complete";

export type PipelineStatus = "started" | "progress" | "succeeded" | "failed";

export interface TranscriptWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface TranscriptCue {
  text: string;
  startMs: number;
  endMs: number;
}

export interface Transcript {
  words: TranscriptWord[];
  cues: TranscriptCue[];
  fullText: string;
  durationSeconds: number;
}

export interface Moment {
  rank: number;
  title: string;
  reason: string;
  startSeconds: number;
  endSeconds: number;
}

export interface Distillation {
  brief: string;
  moments: Moment[];
}

export interface ClipResult {
  rank: number;
  fileName: string;
  playable: boolean;
  error?: string;
}

export interface FinalResult extends Distillation {
  runId: string;
  durationSeconds: number;
  clips: ClipResult[];
}

export interface RequestBudgetSnapshot {
  usedThisRun: 0 | 1;
  maximumPerRun: 1;
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface EventProgress {
  current: number;
  total: number;
  percent: number;
}

export interface PublicError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  issues?: string[];
}

export interface ProgressEvent {
  version: 1;
  runId: string;
  sequence: number;
  timestamp: string;
  phase: PipelinePhase;
  status: PipelineStatus;
  message: string;
  requestBudget: RequestBudgetSnapshot;
  progress?: EventProgress;
  error?: PublicError;
  result?: FinalResult;
}
