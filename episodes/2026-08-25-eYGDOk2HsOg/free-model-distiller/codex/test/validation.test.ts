import { describe, expect, test } from "bun:test";
import { validateModelOutput } from "../src/validation.ts";

const valid = {
  brief: "This video explains a concrete technical topic in detail. It compares the available approaches, demonstrates the important tradeoffs, and concludes with practical advice grounded in the transcript.",
  moments: [
    { rank: 1, title: "The central insight", reason: "This establishes the main argument clearly.", startSeconds: 10, endSeconds: 40 },
    { rank: 2, title: "The practical example", reason: "This turns the argument into a useful example.", startSeconds: 50, endSeconds: 80 },
    { rank: 3, title: "The final takeaway", reason: "This condenses the conclusion into an actionable point.", startSeconds: 90, endSeconds: 120 }
  ]
};

describe("validateModelOutput", () => {
  test("accepts the exact contract", () => {
    expect(validateModelOutput(JSON.stringify(valid), 180).moments).toHaveLength(3);
  });

  test("does not coerce string timestamps", () => {
    const malformed = structuredClone(valid);
    const first = malformed.moments[0];
    if (first !== undefined) first.startSeconds = "10" as unknown as number;
    expect(() => validateModelOutput(JSON.stringify(malformed), 180)).toThrow();
  });

  test("rejects any count other than exactly three moments", () => {
    const malformed = structuredClone(valid);
    malformed.moments.pop();
    expect(() => validateModelOutput(JSON.stringify(malformed), 180)).toThrow(
      "failed validation",
    );
  });

  test("unwraps Markdown fences locally before strict validation", () => {
    expect(
      validateModelOutput(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``, 180).moments,
    ).toHaveLength(3);
  });

  test("unwraps a reasoning tag without making a repair request", () => {
    expect(
      validateModelOutput(`<think>Checking timestamps.</think>\n${JSON.stringify(valid)}`, 180)
        .moments,
    ).toHaveLength(3);
  });

  test("extracts one JSON object from a prose wrapper", () => {
    expect(validateModelOutput(`Result follows:\n${JSON.stringify(valid)}`, 180).moments).toHaveLength(3);
  });
});
