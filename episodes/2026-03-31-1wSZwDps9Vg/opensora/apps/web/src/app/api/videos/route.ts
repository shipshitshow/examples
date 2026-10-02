import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { CreditBalance, CreditTransaction } from '@/models/credit';
import { Generation } from '@/models/generation';
import { submitGeneration } from '@/services/video-generation';

const CREDITS_PER_GENERATION = Number(process.env['CREDITS_PER_GENERATION'] ?? 1);

const VALID_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];

const createSchema = z.object({
  prompt: z.string().min(1).max(1000),
  aspectRatio: z
    .string()
    .refine((v) => VALID_ASPECT_RATIOS.includes(v), {
      message: `aspectRatio must be one of: ${VALID_ASPECT_RATIOS.join(', ')}`,
    })
    .default('16:9'),
  durationSeconds: z.coerce.number().int().min(1).max(60).default(5),
});

/** POST /api/videos — submit a new generation */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body: unknown = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();

  const creditDoc = await CreditBalance.findOne({ userId: auth.payload.sub }).lean();
  if ((creditDoc?.balance ?? 0) < CREDITS_PER_GENERATION) {
    return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
  }

  // Optimistic credit deduction
  await CreditBalance.findOneAndUpdate(
    { userId: auth.payload.sub },
    { $inc: { balance: -CREDITS_PER_GENERATION } },
  );

  const job = await Generation.create({
    userId: auth.payload.sub,
    prompt: parsed.data.prompt,
    aspectRatio: parsed.data.aspectRatio,
    durationSeconds: parsed.data.durationSeconds,
    status: 'queued',
  });

  await CreditTransaction.create({
    userId: auth.payload.sub,
    amount: -CREDITS_PER_GENERATION,
    type: 'debit',
    description: `Video generation: ${parsed.data.prompt.slice(0, 50)}`,
    generationId: job._id,
  });

  // Fire-and-forget submission to fal.ai
  submitGeneration(parsed.data)
    .then(async (result) => {
      await Generation.findByIdAndUpdate(job._id, {
        externalJobId: result.externalJobId,
        status: result.status,
      });
    })
    .catch(async (err: unknown) => {
      await Generation.findByIdAndUpdate(job._id, {
        status: 'failed',
        errorMessage: String(err),
      });
      await CreditBalance.findOneAndUpdate(
        { userId: auth.payload.sub },
        { $inc: { balance: CREDITS_PER_GENERATION } },
      );
      await CreditTransaction.create({
        userId: auth.payload.sub,
        amount: CREDITS_PER_GENERATION,
        type: 'refund',
        description: 'Refund: generation submission failed',
        generationId: job._id,
      });
    });

  return NextResponse.json(
    {
      id: job._id.toString(),
      prompt: job.prompt,
      aspectRatio: job.aspectRatio,
      durationSeconds: job.durationSeconds,
      status: job.status,
      createdAt: job.createdAt,
    },
    { status: 202 },
  );
}

/** GET /api/videos — list the authenticated user's generations */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await connectDb();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') ?? '20')));

  const filter = { userId: auth.payload.sub };
  const [total, docs] = await Promise.all([
    Generation.countDocuments(filter),
    Generation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
  ]);

  return NextResponse.json({
    data: docs.map((g) => ({
      id: g._id.toString(),
      prompt: g.prompt,
      aspectRatio: g.aspectRatio,
      durationSeconds: g.durationSeconds,
      status: g.status,
      r2Key: g.r2Key,
      errorMessage: g.errorMessage,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
    total,
    page,
    pageSize,
  });
}
