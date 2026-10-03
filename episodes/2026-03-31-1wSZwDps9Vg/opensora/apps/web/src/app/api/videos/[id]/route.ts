import { type NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { Generation } from '@/models/generation';
import { pollGeneration } from '@/services/video-generation';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  await connectDb();

  const job = await Generation.findById(id);
  if (!job || job.userId.toString() !== auth.payload.sub) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // If still processing, poll fal.ai for a live status update
  if ((job.status === 'queued' || job.status === 'processing') && job.externalJobId) {
    try {
      const result = await pollGeneration(job.externalJobId);
      job.status = result.status;
      if (result.status === 'completed' && result.videoUrl) {
        job.r2Key = result.videoUrl; // store URL directly for MVP
      } else if (result.status === 'failed') {
        job.errorMessage = 'Generation failed';
      }
      await job.save();
    } catch {
      // Non-fatal — return current status
    }
  }

  return NextResponse.json({
    id: job._id.toString(),
    prompt: job.prompt,
    aspectRatio: job.aspectRatio,
    durationSeconds: job.durationSeconds,
    status: job.status,
    url: job.r2Key ?? null,
    errorMessage: job.errorMessage ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
