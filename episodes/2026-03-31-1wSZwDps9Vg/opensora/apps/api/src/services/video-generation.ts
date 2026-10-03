import { config } from '../config.js';

export interface GenerationInput {
  prompt: string;
  aspectRatio: string;
  durationSeconds: number;
}

export interface GenerationResult {
  externalJobId: string;
  videoUrl: string | undefined;
  status: 'queued' | 'processing' | 'completed' | 'failed';
}

/**
 * Submit a video generation request to fal.ai.
 * Falls back to a mock when FAL_KEY is not configured (dev/test).
 */
export async function submitGeneration(input: GenerationInput): Promise<GenerationResult> {
  if (!config.FAL_KEY) {
    // Mock mode: return a fake queued job
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { externalJobId: mockId, videoUrl: undefined, status: 'queued' };
  }

  // Use fal.ai queue API for async video generation
  const response = await fetch(
    'https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video',
    {
      method: 'POST',
      headers: {
        Authorization: `Key ${config.FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        duration: String(input.durationSeconds),
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fal.ai submission failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { request_id: string; status: string };
  return {
    externalJobId: data.request_id,
    videoUrl: undefined,
    status: 'queued',
  };
}

/**
 * Poll fal.ai for the status of an existing generation.
 */
export async function pollGeneration(externalJobId: string): Promise<GenerationResult> {
  if (!config.FAL_KEY || externalJobId.startsWith('mock-')) {
    // Mock: randomly complete after a while
    return { externalJobId, videoUrl: undefined, status: 'processing' };
  }

  const response = await fetch(
    `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/text-to-video/requests/${externalJobId}/status`,
    { headers: { Authorization: `Key ${config.FAL_KEY}` } },
  );

  if (!response.ok) {
    throw new Error(`fal.ai poll failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    status: string;
    response_url?: string;
  };

  if (data.status === 'COMPLETED' && data.response_url) {
    // Fetch the result to get the video URL
    const resultRes = await fetch(data.response_url, {
      headers: { Authorization: `Key ${config.FAL_KEY}` },
    });
    const result = (await resultRes.json()) as { video?: { url: string } };
    return {
      externalJobId,
      status: 'completed',
      videoUrl: result.video?.url,
    };
  }

  if (data.status === 'FAILED') {
    return { externalJobId, videoUrl: undefined, status: 'failed' };
  }

  return { externalJobId, videoUrl: undefined, status: 'processing' };
}
