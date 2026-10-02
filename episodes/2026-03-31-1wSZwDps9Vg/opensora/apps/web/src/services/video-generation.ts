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

const FAL_KEY = process.env['FAL_KEY'];
const FAL_MODEL = 'fal-ai/kling-video/v1.6/standard/text-to-video';

export async function submitGeneration(input: GenerationInput): Promise<GenerationResult> {
  if (!FAL_KEY) {
    const mockId = `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { externalJobId: mockId, videoUrl: undefined, status: 'queued' };
  }

  const response = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      duration: String(input.durationSeconds),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`fal.ai submission failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { request_id: string };
  return { externalJobId: data.request_id, videoUrl: undefined, status: 'queued' };
}

export async function pollGeneration(externalJobId: string): Promise<GenerationResult> {
  if (!FAL_KEY || externalJobId.startsWith('mock-')) {
    return { externalJobId, videoUrl: undefined, status: 'processing' };
  }

  const response = await fetch(
    `https://queue.fal.run/${FAL_MODEL}/requests/${externalJobId}/status`,
    { headers: { Authorization: `Key ${FAL_KEY}` } },
  );

  if (!response.ok) {
    throw new Error(`fal.ai poll failed: ${response.status}`);
  }

  const data = (await response.json()) as { status: string; response_url?: string };

  if (data.status === 'COMPLETED' && data.response_url) {
    const resultRes = await fetch(data.response_url, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    });
    const result = (await resultRes.json()) as { video?: { url: string } };
    return { externalJobId, status: 'completed', videoUrl: result.video?.url };
  }

  if (data.status === 'FAILED') {
    return { externalJobId, videoUrl: undefined, status: 'failed' };
  }

  return { externalJobId, videoUrl: undefined, status: 'processing' };
}
