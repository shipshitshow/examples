import { SERVER_PORT } from "./config";
import { distill } from "./pipeline";

const INDEX = Bun.file("public/index.html");

const server = Bun.serve({
  port: SERVER_PORT,
  // SSE streams stay silent for minutes during download/analyze; max out idle timeout
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") return new Response(INDEX);

    if (url.pathname === "/events") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("missing ?url", { status: 400 });

      let id = 0;
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const enc = new TextEncoder();
          // keepalive comments hold the connection through long silent phases
          const ping = setInterval(
            () => controller.enqueue(enc.encode(`: ping\n\n`)),
            15_000,
          );
          try {
            for await (const ev of distill(target)) {
              controller.enqueue(
                enc.encode(`id: ${id++}\nevent: progress\ndata: ${JSON.stringify(ev)}\n\n`),
              );
            }
          } catch (e) {
            controller.enqueue(
              enc.encode(
                `event: progress\ndata: ${JSON.stringify({ type: "error", message: String(e), fatal: true })}\n\n`,
              ),
            );
          } finally {
            clearInterval(ping);
            controller.close();
          }
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (url.pathname.startsWith("/clips/")) {
      const rel = url.pathname.slice("/clips/".length);
      if (rel.includes("..")) return new Response("forbidden", { status: 403 });
      const file = Bun.file(`work/${rel}`);
      if (!(await file.exists())) return new Response("not found", { status: 404 });
      return new Response(file, { headers: { "Content-Type": "video/mp4" } });
    }

    return new Response("not found", { status: 404 });
  },
});

console.log(`distiller UI: http://localhost:${server.port}`);
