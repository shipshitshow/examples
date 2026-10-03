import { ShellError } from "../types";

export async function run(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new ShellError(cmd.join(" "), code, stderr.slice(-800));
  }
  return stdout;
}

export async function requireTool(name: string): Promise<void> {
  try {
    await run(["which", name]);
  } catch {
    throw new Error(`${name} not found on PATH. Install it first.`);
  }
}
