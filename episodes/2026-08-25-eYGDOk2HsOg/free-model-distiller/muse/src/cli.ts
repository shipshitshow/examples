import { runPipeline } from "./pipeline.ts";

function printUsage(): void {
  console.log("Usage: bun src/cli.ts <youtube-url> [--tmp tmp]");
}

const url = process.argv[2];
if (!url || url === "-h" || url === "--help") {
  printUsage();
  process.exit(url ? 0 : 1);
}

let tmpBase: string | undefined;
const tmpIdx = process.argv.indexOf("--tmp");
if (tmpIdx !== -1) tmpBase = process.argv[tmpIdx + 1];

let hadError = false;

for await (const ev of runPipeline(url, { tmpBase })) {
  const tag = `[${ev.phase}:${ev.status}]`;
  const count = `(${ev.requestCount} req)`;
  if (ev.status === "error") {
    hadError = true;
    console.error(`${tag} ${count} ${ev.message}`);
    if (ev.error?.issues) for (const issue of ev.error.issues) console.error(`  - ${issue}`);
    if (ev.error?.retryAfterSeconds) console.error(`  retry after ${ev.error.retryAfterSeconds}s`);
    if (ev.error?.details && ev.error.details !== ev.message) console.error(`  ${ev.error.details}`);
  } else if (ev.phase === "done" && ev.status === "done" && ev.result) {
    console.log(`\n=== BRIEF ===\n${ev.result.brief}\n`);
    console.log(`=== MOMENTS (${ev.result.moments.length}) ===`);
    for (const m of ev.result.moments) {
      console.log(`#${m.rank} [${m.startSeconds}-${m.endSeconds}] ${m.title}\n   ${m.reason}`);
    }
    console.log(`\n=== CLIPS ===`);
    for (const c of ev.result.clips) {
      console.log(`${c.ok ? "ok " : "fail"} rank ${c.rank} -> ${c.path} ${c.error ? `(${c.error.slice(0, 120)})` : ""}`);
    }
    console.log(`\nRequests used: ${ev.requestCount}/1000 — ${ev.message}`);
  } else {
    const pct = ev.percent !== undefined ? ` ${ev.percent}%` : "";
    console.error(`${tag} ${count}${pct} ${ev.message}`);
  }
}

process.exit(hadError ? 1 : 0);
