import { DistillerError } from "./errors.ts";

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

const MAX_DIAGNOSTIC_LENGTH = 4_000;

function sanitizeDiagnostic(value: string): string {
  return value
    .replace(/sk-or-v1-[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, MAX_DIAGNOSTIC_LENGTH);
}

export async function runCommand(
  command: string,
  args: readonly string[],
  cwd?: string,
): Promise<CommandResult> {
  let processHandle: Bun.Subprocess<"ignore", "pipe", "pipe">;
  try {
    processHandle = Bun.spawn([command, ...args], {
      cwd,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    throw new DistillerError(
      `${command.toUpperCase().replaceAll("-", "_")}_NOT_FOUND`,
      `${command} is not installed or cannot be executed`,
    );
  }

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(processHandle.stdout).text(),
    new Response(processHandle.stderr).text(),
    processHandle.exited,
  ]);

  return {
    exitCode,
    stdout: sanitizeDiagnostic(stdout),
    stderr: sanitizeDiagnostic(stderr),
  };
}

export async function requireBinary(command: "yt-dlp" | "ffmpeg"): Promise<void> {
  const versionArguments = command === "yt-dlp" ? ["--version"] : ["-version"];
  const result = await runCommand(command, versionArguments);
  if (result.exitCode !== 0) {
    throw new DistillerError(
      `${command.toUpperCase().replaceAll("-", "_")}_NOT_FOUND`,
      `${command} is required. Install it with: brew install ${command}`,
    );
  }
}
