import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { formatTranscript, parseJson3 } from "../src/transcript.ts";

const fixture: unknown = JSON.parse(
  readFileSync(new URL("./fixtures/captions.json3", import.meta.url), "utf8"),
);

describe("parseJson3", () => {
  test("uses event start plus segment offset", () => {
    const transcript = parseJson3(fixture);
    expect(transcript.words.map((word) => word.startMs)).toEqual([1000, 1500, 1900, 5100]);
    expect(transcript.cues[0]?.text).toBe("Hello world.");
    expect(transcript.durationSeconds).toBe(7);
  });

  test("formats every cue without truncation", () => {
    const transcript = parseJson3(fixture);
    const formatted = formatTranscript(transcript);
    expect(formatted).toContain("Hello world.");
    expect(formatted).toContain("A second caption");
    expect(formatted).not.toContain("truncated");
  });

  test("rejects caption files without usable words", () => {
    expect(() => parseJson3({ events: [{ tStartMs: 0 }] })).toThrow();
  });
});
