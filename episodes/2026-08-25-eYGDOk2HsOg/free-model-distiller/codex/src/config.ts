export const PRIMARY_MODEL_ID = "minimax/minimax-m3:free" as const;

export const MODEL_ROUTE = [
  PRIMARY_MODEL_ID,
  "nvidia/nemotron-3.5-lightning:free",
  "openrouter/free",
] as const;

export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const MODEL_TIMEOUT_MS = 120_000;
export const REQUESTS_PER_MINUTE = 20;
export const REQUESTS_PER_DAY = 1_000;

export function requireApiKey(): string {
  const value = process.env.OPENROUTER_API_KEY;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  return value;
}
