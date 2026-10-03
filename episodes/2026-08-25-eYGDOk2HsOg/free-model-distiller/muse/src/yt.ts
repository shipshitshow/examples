import { spawn } from "bun";
import { readdir } from "fs/promises";
import { join } from "path";
import { YtDlpError, NoCaptionsError } from "./types.ts";

async function run(cmd: string, args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = spawn({ cmd: [cmd, ...args], cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

function sanitize(s: string): string {
  // strip accidental key-like long tokens
  return s.replace(/sk-[a-zA-Z0-9-_]{10,}/g, "[redacted]").slice(0, 4000);
}

export async function downloadVideoAndCaptions(url: string, tmpDir: string): Promise<{ videoPath: string; json3Path: string }> {
  // validate we have yt-dlp
  const check = await run("yt-dlp", ["--version"], tmpDir).catch(() => null);
  if (!check || check.exitCode !== 0) throw new YtDlpError("yt-dlp not found — install with: brew install yt-dlp");

  const outTemplate = join(tmpDir, "%(id)s.%(ext)s");

  // single yt-dlp call: download video + auto captions json3
  // no explicit -f — let yt-dlp auto-select best (DASH video+audio need merge). --merge-output-format ensures mp4.
  const args = [
    "--write-auto-sub",
    "--sub-lang", "en",
    "--sub-format", "json3",
    "-o", outTemplate,
    "--merge-output-format", "mp4",
    "--no-playlist",
    url,
  ];

  const res = await run("yt-dlp", args, tmpDir);
  if (res.exitCode !== 0) {
    throw new YtDlpError(sanitize(res.stderr || res.stdout || `yt-dlp exited ${res.exitCode}`));
  }

  const files = await readdir(tmpDir).catch(() => [] as string[]);
  const video = files.find((f) => f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"));
  const json3 = files.find((f) => f.endsWith(".json3"));

  if (!video) throw new YtDlpError("yt-dlp finished but no video file found");
  if (!json3) throw new NoCaptionsError("No English auto-captions found (no .json3). Try a different video with captions enabled.");

  return { videoPath: join(tmpDir, video), json3Path: join(tmpDir, json3) };
}
