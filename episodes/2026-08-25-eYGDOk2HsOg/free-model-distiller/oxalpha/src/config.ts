export const MODEL_ID = "minimax/minimax-m3:free";
export const FALLBACK_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
] as const;

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const REQUEST_TIMEOUT_MS = 120_000;
export const MIN_CLIP_SECONDS = 15;
export const MAX_CLIP_SECONDS = 90;
export const MIN_MOMENTS = 3;
export const MAX_CLIPS = 5;
export const SEGMENT_GAP_MS = 2000;
export const SERVER_PORT = 8080;
