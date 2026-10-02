export const MODEL_ID = "minimax/minimax-m3:free" as const;
export const FALLBACK_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
] as const;

export class MissingKeyError extends Error {
  constructor() {
    super("Missing OPENROUTER_API_KEY. Set it: export OPENROUTER_API_KEY=your_key");
    this.name = "MissingKeyError";
  }
}

export function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim().length === 0) throw new MissingKeyError();
  return key;
}
