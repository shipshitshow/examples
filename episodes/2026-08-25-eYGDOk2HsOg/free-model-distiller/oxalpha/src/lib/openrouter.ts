import { OPENROUTER_URL, REQUEST_TIMEOUT_MS } from "../config";
import { RateLimitError, TimeoutError } from "../types";

export function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Export it first:\n  export OPENROUTER_API_KEY=sk-or-...",
    );
  }
  return key.trim();
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export async function chat(
  model: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "youtube-distiller",
      },
      body: JSON.stringify({ model, temperature: 0.3, max_tokens: 2000, messages }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new TimeoutError(model);
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    const ra = res.headers.get("retry-after");
    const retryAfterMs = ra ? Number(ra) * 1000 : undefined;
    await res.body?.cancel();
    throw new RateLimitError(model, Number.isFinite(retryAfterMs) ? retryAfterMs : undefined);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openrouter ${res.status}: ${body.slice(0, 300)}`);
  }

  const data: unknown = await res.json();
  const content = extractContent(data);
  if (content === null) throw new Error(`unexpected response shape from ${model}`);
  return content;
}

function extractContent(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const choices = (data as Record<string, unknown>)["choices"];
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  if (typeof first !== "object" || first === null) return null;
  const message = (first as Record<string, unknown>)["message"];
  if (typeof message !== "object" || message === null) return null;
  const content = (message as Record<string, unknown>)["content"];
  return typeof content === "string" ? content : null;
}
