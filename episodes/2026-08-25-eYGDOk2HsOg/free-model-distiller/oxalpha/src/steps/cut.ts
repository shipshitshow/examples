import { mkdirSync } from "node:fs";
import { requireTool, run } from "../lib/shell";
import type { Moment } from "../types";

function safeName(title: string, index: number): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `clip-${index}-${base || "moment"}.mp4`;
}

export async function cutMoments(
  videoFile: string,
  dir: string,
  moments: Moment[],
): Promise<{ index: number; title: string; file: string }[]> {
  await requireTool("ffmpeg");
  const clipsDir = `${dir}/clips`;
  mkdirSync(clipsDir, { recursive: true });

  const results: { index: number; title: string; file: string }[] = [];
  for (let i = 0; i < moments.length; i++) {
    const m = moments[i]!;
    const file = `${clipsDir}/${safeName(m.title, i + 1)}`;
    await run([
      "ffmpeg",
      "-y",
      "-loglevel",
      "error",
      "-ss",
      String(m.startSeconds),
      "-to",
      String(m.endSeconds),
      "-i",
      videoFile,
      "-c",
      "copy",
      file,
    ]);
    results.push({ index: i + 1, title: m.title, file });
  }
  return results;
}
