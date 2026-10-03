import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { DistillerError } from "./errors.ts";
import { runCommand } from "./subprocess.ts";

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_EXTENSIONS = new Set([".mp4", ".mkv", ".webm", ".mov"]);

export function validateYouTubeUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DistillerError("INVALID_YOUTUBE_URL", "Enter a valid YouTube URL");
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new DistillerError(
      "INVALID_YOUTUBE_URL",
      "Only HTTPS youtube.com and youtu.be URLs are supported",
    );
  }
  return url;
}

function extension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export async function downloadVideoAndCaptions(
  sourceUrl: URL,
  runDirectory: string,
): Promise<{ videoPath: string; captionsPath: string }> {
  const template = join(runDirectory, "source.%(ext)s");
  const result = await runCommand(
    "yt-dlp",
    [
      "--no-playlist",
      "--write-auto-subs",
      "--sub-langs",
      "en",
      "--sub-format",
      "json3",
      "--merge-output-format",
      "mp4",
      "--output",
      template,
      sourceUrl.toString(),
    ],
    runDirectory,
  );

  if (result.exitCode !== 0) {
    throw new DistillerError(
      "YT_DLP_FAILED",
      result.stderr || result.stdout || `yt-dlp exited with ${result.exitCode}`,
    );
  }

  const files = await readdir(runDirectory);
  const captions = files.find((file) => file.endsWith(".json3"));
  const video = files.find((file) => VIDEO_EXTENSIONS.has(extension(file)));

  if (captions === undefined) {
    throw new DistillerError(
      "NO_ENGLISH_CAPTIONS",
      "This video has no English auto-captions in json3 format",
    );
  }
  if (video === undefined) {
    throw new DistillerError("VIDEO_NOT_FOUND", "yt-dlp completed without a video file");
  }

  return {
    videoPath: join(runDirectory, video),
    captionsPath: join(runDirectory, captions),
  };
}
