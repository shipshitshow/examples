import { resolve, sep } from "node:path";
import { runPipeline } from "./pipeline.ts";

const port = Number(process.env.PORT ?? 3002);
const publicDirectory = resolve(import.meta.dir, "..", "public");
const runsDirectory = resolve(import.meta.dir, "..", "tmp", "runs");
let runActive = false;

function json(value: unknown, status: number): Response {
  return Response.json(value, { status });
}

function clipPath(pathname: string): string | undefined {
  const match = /^\/clips\/([0-9a-f-]{36})\/([A-Za-z0-9._-]+\.mp4)$/.exec(pathname);
  if (match === null) return undefined;
  const runId = match[1];
  const fileName = match[2];
  if (runId === undefined || fileName === undefined) return undefined;
  const candidate = resolve(runsDirectory, runId, "clips", fileName);
  const permittedRoot = resolve(runsDirectory, runId, "clips") + sep;
  return candidate.startsWith(permittedRoot) ? candidate : undefined;
}

const server = Bun.serve({
  port,
  idleTimeout: 255,
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);

    if (requestUrl.pathname === "/api/distill") {
      const sourceUrl = requestUrl.searchParams.get("url");
      if (sourceUrl === null || sourceUrl.trim() === "") {
        return json({ error: "A YouTube URL is required" }, 400);
      }
      if (runActive) return json({ error: "Another distillation is already running" }, 409);
      runActive = true;

      const stream = new ReadableStream<Uint8Array>({
        start(controller): void {
          const encoder = new TextEncoder();
          let closed = false;
          const heartbeat = setInterval(() => {
            if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
          }, 10_000);

          void (async () => {
            try {
              for await (const update of runPipeline(sourceUrl, { temporaryRoot: runsDirectory })) {
                controller.enqueue(
                  encoder.encode(
                    `id: ${update.sequence}\nevent: progress\ndata: ${JSON.stringify(update)}\n\n`,
                  ),
                );
              }
            } catch (error: unknown) {
              const message = error instanceof Error ? error.message : "Unexpected server failure";
              controller.enqueue(
                encoder.encode(
                  `event: progress\ndata: ${JSON.stringify({
                    version: 1,
                    phase: "complete",
                    status: "failed",
                    message,
                  })}\n\n`,
                ),
              );
            } finally {
              closed = true;
              clearInterval(heartbeat);
              runActive = false;
              controller.close();
            }
          })();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const requestedClip = clipPath(requestUrl.pathname);
    if (requestedClip !== undefined) {
      const file = Bun.file(requestedClip);
      return (await file.exists())
        ? new Response(file, { headers: { "Content-Type": "video/mp4" } })
        : new Response("Clip not found", { status: 404 });
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      return new Response(Bun.file(resolve(publicDirectory, "index.html")), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`YouTube Distiller listening on ${server.url}`);
