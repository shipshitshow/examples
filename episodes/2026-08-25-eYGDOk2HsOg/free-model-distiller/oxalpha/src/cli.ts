import { distill } from "./pipeline";

const url = process.argv[2];
if (!url) {
  console.error("usage: bun run src/cli.ts <youtube-url>");
  process.exit(1);
}

for await (const e of distill(url)) {
  switch (e.type) {
    case "run:start":
      console.log(`▶ ${e.videoId}`);
      break;
    case "step:start":
      console.log(`— ${e.step}`);
      break;
    case "progress":
      console.log(`  ${e.message}`);
      break;
    case "request:start":
      console.log(`  → model ${e.model}`);
      break;
    case "request:end":
      console.log(
        `  ← ${e.model} ok=${e.ok} ${e.ms}ms | budget: run=${e.runRequests} today=${e.today}/1000 minute=${e.minute}/20`,
      );
      break;
    case "request:fallback":
      console.log(`  ⚠ fallback ${e.from} → ${e.to} (${e.cause})`);
      break;
    case "brief:done":
      console.log(`\nBRIEF:\n${e.brief}\n\n${e.momentCount} moment(s):`);
      break;
    case "moment:done":
      console.log(`  #${e.index} ${e.title}`);
      console.log(`     ${e.file}`);
      break;
    case "done":
      console.log("\n✓ done");
      break;
    case "error":
      console.error(`\n✗ ERROR${e.step ? ` [${e.step}]` : ""}: ${e.message}`);
      break;
  }
}
