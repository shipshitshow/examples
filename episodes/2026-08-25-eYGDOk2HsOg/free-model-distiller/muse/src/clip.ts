import { spawn } from "bun";
import type { Moment } from "./types.ts";
import type { ClipInfo } from "./types.ts";

async function runFfmpeg(args: string[]): Promise<{ ok: boolean; stderr: string }> {
  const proc = spawn({ cmd: ["ffmpeg", ...args], stdout: "pipe", stderr: "pipe" });
  const stderr = await new Response(proc.stderr).text();
  await new Response(proc.stdout).text().catch(() => "");
  const code = await proc.exited;
  return { ok: code === 0, stderr };
}

export async function cutClips(videoPath: string, moments: Moment[], outDir: string): Promise<ClipInfo[]> {
  const results: ClipInfo[] = [];
  for (const m of moments) {
    const outPath = `${outDir}/clip-${m.rank}-${m.startSeconds}-${m.endSeconds}.mp4`;
    const baseArgs = ["-y", "-ss", String(m.startSeconds), "-to", String(m.endSeconds), "-i", videoPath];

    // try stream copy first (fast)
    let r = await runFfmpeg([...baseArgs, "-c", "copy", outPath]);
    if (!r.ok) {
      // fallback to re-encode
      r = await runFfmpeg([...baseArgs, "-c:v", "libx264", "-c:a", "aac", "-preset", "veryfast", outPath]);
    }

    if (r.ok) {
      results.push({ rank: m.rank, title: m.title, path: outPath, startSeconds: m.startSeconds, endSeconds: m.endSeconds, ok: true });
    } else {
      results.push({ rank: m.rank, title: m.title, path: outPath, startSeconds: m.startSeconds, endSeconds: m.endSeconds, ok: false, error: r.stderr.slice(0, 800) });
    }
  }
  return results;
}
