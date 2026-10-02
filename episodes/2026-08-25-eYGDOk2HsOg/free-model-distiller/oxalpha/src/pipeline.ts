import { Budget } from "./lib/budget";
import { extractVideoId, fetchVideo } from "./steps/fetch";
import { buildTranscript } from "./steps/transcript";
import { analyze, ensureApiKey } from "./steps/analyze";
import { cutMoments } from "./steps/cut";
import type { AnalyzedResult, ClipInfo, ProgressEvent } from "./types";

async function runPipeline(
  url: string,
  emit: (e: ProgressEvent) => void,
): Promise<void> {
  const budget = new Budget("work/state.json");
  budget.load();

  let videoId: string;
  try {
    videoId = extractVideoId(url);
  } catch (e) {
    emit({ type: "error", message: e instanceof Error ? e.message : String(e), fatal: true });
    return;
  }
  emit({ type: "run:start", url, videoId });

  try {
    // preflight: key check before any download
    emit({ type: "step:start", step: "preflight" });
    const apiKey = ensureApiKey();

    // captions FIRST — no-captions aborts before spending bandwidth on video
    emit({ type: "step:start", step: "captions" });
    const fetched = await fetchVideo(url, videoId);
    emit({ type: "progress", step: "download", message: "video downloaded" });

    emit({ type: "step:start", step: "transcript" });
    const raw = await Bun.file(fetched.captionsFile!).text();
    const { transcript, wordCount } = buildTranscript(raw);
    emit({ type: "progress", step: "transcript", message: `${wordCount} words parsed` });

    // THE one model request
    emit({ type: "step:start", step: "analyze" });
    const result: AnalyzedResult = await analyze(
      transcript,
      fetched.durationSeconds,
      budget,
      emit,
      apiKey,
    );
    emit({ type: "brief:done", brief: result.brief, momentCount: result.moments.length });

    emit({ type: "step:start", step: "cut" });
    const clipsRaw = await cutMoments(fetched.videoFile, fetched.dir, result.moments);
    const clips: ClipInfo[] = clipsRaw.map((c, i) => ({
      index: c.index,
      title: c.title,
      reason: result.moments[i]!.reason,
      startSeconds: result.moments[i]!.startSeconds,
      endSeconds: result.moments[i]!.endSeconds,
      file: c.file,
    }));
    for (const c of clips) {
      emit({ type: "moment:done", index: c.index, title: c.title, file: c.file });
    }
    emit({ type: "done", clips });
  } catch (e) {
    emit({
      type: "error",
      message: e instanceof Error ? e.message : String(e),
      fatal: true,
    });
    const snap = budget.snapshot();
    if (snap.runRequests > 0) {
      emit({
        type: "progress",
        step: "analyze",
        message: `budget spent this run: ${snap.runRequests} request(s), ${snap.today}/1000 today`,
      });
    }
  }
}

export async function* distill(url: string): AsyncGenerator<ProgressEvent> {
  const q: ProgressEvent[] = [];
  let notify: (() => void) | null = null;
  let finished = false;
  const emit = (e: ProgressEvent) => {
    q.push(e);
    const n = notify;
    notify = null;
    n?.();
  };
  const done = runPipeline(url, emit).then(() => {
    finished = true;
    const n = notify;
    notify = null;
    n?.();
  });
  try {
    while (true) {
      while (q.length > 0) {
        yield q.shift()!;
      }
      if (finished) return;
      await new Promise<void>((res) => (notify = res));
    }
  } finally {
    await done.catch(() => {});
  }
}
