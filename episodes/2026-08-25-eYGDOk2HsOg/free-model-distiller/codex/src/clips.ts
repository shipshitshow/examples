import { join } from "node:path";
import type { ClipResult, Moment } from "./types.ts";
import { runCommand } from "./subprocess.ts";

export async function cutClip(options: {
  videoPath: string;
  moment: Moment;
  outputDirectory: string;
}): Promise<ClipResult> {
  const rank = String(options.moment.rank).padStart(2, "0");
  const fileName = `moment-${rank}-${options.moment.startSeconds}-${options.moment.endSeconds}.mp4`;
  const outputPath = join(options.outputDirectory, fileName);
  const duration = options.moment.endSeconds - options.moment.startSeconds;
  const result = await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(options.moment.startSeconds),
    "-i",
    options.videoPath,
    "-t",
    String(duration),
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    "-avoid_negative_ts",
    "make_zero",
    outputPath,
  ]);

  return result.exitCode === 0
    ? { rank: options.moment.rank, fileName, playable: true }
    : {
        rank: options.moment.rank,
        fileName,
        playable: false,
        error: result.stderr || `ffmpeg exited with ${result.exitCode}`,
      };
}
