import { describe, expect, test } from "bun:test";
import { requestDistillation } from "../src/openrouter.ts";
import { RequestBudget } from "../src/request-budget.ts";

describe("one-request invariant", () => {
  test("makes one outbound request with the complete model route", async () => {
    let calls = 0;
    let requestBody: unknown;
    let requestHeaders: Headers | undefined;
    const fetcher = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      calls += 1;
      requestBody = JSON.parse(String(init?.body)) as unknown;
      requestHeaders = new Headers(init?.headers);
      return Response.json({ choices: [{ message: { content: "{}" } }] });
    };
    const budget = new RequestBudget();
    await requestDistillation({
      apiKey: "test-key",
      transcript: "[00:00:00.000–00:00:01.000] test",
      durationSeconds: 1,
      budget,
      fetcher,
    });
    expect(calls).toBe(1);
    expect(budget.snapshot().usedThisRun).toBe(1);
    expect(requestHeaders?.get("X-Title")).toBe("YouTube Distiller - Codex");
    expect(requestBody).toMatchObject({
      temperature: 0,
      max_tokens: 4_000,
      reasoning: { effort: "none", exclude: true },
      models: [
        "minimax/minimax-m3:free",
        "nvidia/nemotron-3.5-lightning:free",
        "openrouter/free",
      ],
    });
  });

  test("does not retry a final 429", async () => {
    let calls = 0;
    const fetcher = async (): Promise<Response> => {
      calls += 1;
      return new Response("rate limited", { status: 429 });
    };
    await expect(
      requestDistillation({
        apiKey: "test-key",
        transcript: "test",
        durationSeconds: 60,
        budget: new RequestBudget(),
        fetcher,
      }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  test("rejects a truncated completion without retrying", async () => {
    let calls = 0;
    const fetcher = async (): Promise<Response> => {
      calls += 1;
      return Response.json({
        choices: [
          { finish_reason: "length", message: { content: "{\"brief\":" } },
        ],
      });
    };
    await expect(
      requestDistillation({
        apiKey: "test-key",
        transcript: "test",
        durationSeconds: 60,
        budget: new RequestBudget(),
        fetcher,
      }),
    ).rejects.toThrow("output limit");
    expect(calls).toBe(1);
  });
});
