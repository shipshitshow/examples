import { mkdirSync } from "node:fs";
import { run, requireTool } from "../lib/shell";

export function extractVideoId(url: string): string {
  const m =
    url.match(/(?:v=|\/shorts\/|youtu\.be\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/) ??
    url.match(/^([A-Za-z0-9_-]{11})$/);
  if (!m || !m[1]) throw new Error(`cannot extract video id from: ${url}`);
  return m[1];
}

export interface FetchedPaths {
  dir: string;
  captionsFile: string | null;
  videoFile: string;
  durationSeconds: number;
}

export async function fetchVideo(
  url: string,
  videoId: string,
): Promise<FetchedPaths> {
  await requireTool("yt-dlp");
  const dir = `work/${videoId}`;
  mkdirSync(dir, { recursive: true });

  // captions FIRST — abort before downloading video if unavailable
  await run([
    "yt-dlp",
    "--write-auto-subs",
    "--write-subs",
    "--sub-langs",
    "en.*",
    "--sub-format",
    "json3",
    "--skip-download",
    "-o",
    `${dir}/caps`,
    url,
  ]);

  let captionsFile: string | null = null;
  for (const f of [...new Bun.Glob("caps*.json3").scanSync(dir)].sort()) {
    captionsFile = `${dir}/${f}`;
    break;
  }
  if (!captionsFile) {
    throw new Error("no English captions available for this video");
  }

  const durOut = await run(["yt-dlp", "--print", "%(duration)s", "--skip-download", url]);
  const durationSeconds = Number(durOut.trim());
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("could not determine video duration");
  }

  await run([
    "yt-dlp",
    "-f",
    "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
    "--merge-output-format",
    "mp4",
    "-o",
    `${dir}/video.mp4`,
    url,
  ]);

  return { dir, captionsFile, videoFile: `${dir}/video.mp4`, durationSeconds };
}
