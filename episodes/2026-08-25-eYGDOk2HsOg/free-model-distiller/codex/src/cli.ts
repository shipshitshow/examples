import { runPipeline } from "./pipeline.ts";

function usage(): never {
  console.error("Usage: bun run cli -- <youtube-url>");
  process.exit(1);
}

const sourceUrl = process.argv[2];
if (sourceUrl === undefined || sourceUrl === "--help" || sourceUrl === "-h") usage();

let failed = false;
for await (const update of runPipeline(sourceUrl)) {
  const requestCount = `${update.requestBudget.usedThisRun}/${update.requestBudget.maximumPerRun} request`;
  if (update.status === "failed") {
    failed = true;
    console.error(`[${update.phase}] ${update.message} · ${requestCount}`);
    for (const issue of update.error?.issues ?? []) console.error(`  - ${issue}`);
    continue;
  }
  if (update.result !== undefined) {
    console.log(`\n${update.result.brief}\n`);
    for (const moment of update.result.moments) {
      const clip = update.result.clips.find((candidate) => candidate.rank === moment.rank);
      console.log(
        `${moment.rank}. ${moment.title} [${moment.startSeconds}–${moment.endSeconds}s]\n` +
          `   ${moment.reason}\n` +
          `   ${clip?.playable === true ? `tmp/runs/${update.runId}/clips/${clip.fileName}` : "clip unavailable"}`,
      );
    }
    console.log(`\nModel requests used: ${update.requestBudget.usedThisRun}/1`);
  } else {
    const progress = update.progress === undefined ? "" : ` ${update.progress.percent}%`;
    console.error(`[${update.phase}:${update.status}]${progress} ${update.message} · ${requestCount}`);
  }
}

process.exit(failed ? 1 : 0);
