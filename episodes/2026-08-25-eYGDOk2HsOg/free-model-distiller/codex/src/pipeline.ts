import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { cutClip } from "./clips.ts";
import { requireApiKey } from "./config.ts";
import { asDistillerError, DistillerError } from "./errors.ts";
import { requestDistillation } from "./openrouter.ts";
import { RequestBudget } from "./request-budget.ts";
import { requireBinary } from "./subprocess.ts";
import { formatTranscript, parseJson3 } from "./transcript.ts";
import type {
  Distillation,
  FinalResult,
  PipelinePhase,
  PipelineStatus,
  ProgressEvent,
} from "./types.ts";
import { validateModelOutput } from "./validation.ts";
import { downloadVideoAndCaptions, validateYouTubeUrl } from "./youtube.ts";

export interface PipelineOptions {
  temporaryRoot?: string;
}

export async function* runPipeline(
  rawUrl: string,
  options: PipelineOptions = {},
): AsyncGenerator<ProgressEvent, void> {
  const runId = randomUUID();
  const budget = new RequestBudget();
  let sequence = 0;
  const temporaryRoot = options.temporaryRoot ?? join(process.cwd(), "tmp", "runs");
  const runDirectory = join(temporaryRoot, runId);
  const clipsDirectory = join(runDirectory, "clips");

  const event = (
    phase: PipelinePhase,
    status: PipelineStatus,
    message: string,
    extras: Pick<ProgressEvent, "progress" | "error" | "result"> = {},
  ): ProgressEvent => ({
    version: 1,
    runId,
    sequence: ++sequence,
    timestamp: new Date().toISOString(),
    phase,
    status,
    message,
    requestBudget: budget.snapshot(),
    ...extras,
  });

  let apiKey: string;
  let sourceUrl: URL;
  try {
    yield event("preflight", "started", "Checking configuration and local tools");
    apiKey = requireApiKey();
    sourceUrl = validateYouTubeUrl(rawUrl);
    await Promise.all([requireBinary("yt-dlp"), requireBinary("ffmpeg")]);
    await mkdir(clipsDirectory, { recursive: true });
    yield event("preflight", "succeeded", "Configuration, yt-dlp, and ffmpeg are ready");
  } catch (error: unknown) {
    const failure =
      error instanceof Error && error.message === "OPENROUTER_API_KEY is missing"
        ? new DistillerError("MISSING_API_KEY", error.message)
        : asDistillerError(error);
    yield event("preflight", "failed", failure.message, { error: failure.toPublic() });
    return;
  }

  let videoPath: string;
  let captionsPath: string;
  try {
    yield event("download", "started", "Downloading the video and English auto-captions");
    const download = await downloadVideoAndCaptions(sourceUrl, runDirectory);
    videoPath = download.videoPath;
    captionsPath = download.captionsPath;
    yield event("download", "succeeded", "Video and json3 captions downloaded locally");
  } catch (error: unknown) {
    const failure = asDistillerError(error);
    yield event("download", "failed", failure.message, { error: failure.toPublic() });
    return;
  }

  let transcript;
  try {
    yield event("transcript", "started", "Parsing word-timed json3 captions locally");
    const captionText = await readFile(captionsPath, "utf8");
    const parsedJson: unknown = JSON.parse(captionText);
    transcript = parseJson3(parsedJson);
    yield event(
      "transcript",
      "succeeded",
      `Parsed ${transcript.words.length.toLocaleString()} timed words across ${transcript.durationSeconds} seconds`,
    );
  } catch (error: unknown) {
    const failure = asDistillerError(error);
    yield event("transcript", "failed", failure.message, { error: failure.toPublic() });
    return;
  }

  let distillation: Distillation;
  try {
    yield event("analyze", "started", "Sending the complete transcript in one model request");
    const rawOutput = await requestDistillation({
      apiKey,
      transcript: formatTranscript(transcript),
      durationSeconds: transcript.durationSeconds,
      budget,
    });
    distillation = validateModelOutput(rawOutput, transcript.durationSeconds);
    yield event(
      "analyze",
      "succeeded",
      `Validated a brief and ${distillation.moments.length} ranked moments`,
    );
  } catch (error: unknown) {
    const failure = asDistillerError(error);
    yield event("analyze", "failed", failure.message, { error: failure.toPublic() });
    return;
  }

  yield event("clip", "started", `Cutting ${distillation.moments.length} browser-ready clips locally`);
  const clips = [];
  for (let index = 0; index < distillation.moments.length; index += 1) {
    const moment = distillation.moments[index];
    if (moment === undefined) continue;
    const clip = await cutClip({ videoPath, moment, outputDirectory: clipsDirectory });
    clips.push(clip);
    const current = index + 1;
    yield event(
      "clip",
      "progress",
      clip.playable
        ? `Cut moment ${moment.rank}: ${moment.title}`
        : `Moment ${moment.rank} failed to cut`,
      {
        progress: {
          current,
          total: distillation.moments.length,
          percent: Math.round((current / distillation.moments.length) * 100),
        },
      },
    );
  }
  yield event(
    "clip",
    "succeeded",
    `${clips.filter((clip) => clip.playable).length}/${clips.length} clips are playable`,
  );

  const result: FinalResult = {
    runId,
    brief: distillation.brief,
    moments: distillation.moments,
    clips,
    durationSeconds: transcript.durationSeconds,
  };
  yield event("complete", "succeeded", "Distillation complete", { result });
}
