import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { z } from 'zod';

import { config } from '../config.js';
import { CreditBalance, CreditTransaction } from '../models/credit.js';
import { Generation } from '../models/generation.js';
import { Subscription } from '../models/subscription.js';
import { capture } from '../services/posthog.js';
import { getSignedDownloadUrl, uploadToR2 } from '../services/r2.js';
import { submitGeneration, pollGeneration } from '../services/video-generation.js';

const VALID_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];

const createGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty').max(1000),
  aspectRatio: z
    .string()
    .refine((v) => VALID_ASPECT_RATIOS.includes(v), {
      message: `aspectRatio must be one of: ${VALID_ASPECT_RATIOS.join(', ')}`,
    })
    .default('16:9'),
  durationSeconds: z.coerce.number().int().min(1).max(60).default(5),
});

export async function generationRoutes(fastify: FastifyInstance): Promise<void> {
  /** POST /generations — submit a new video generation */
  fastify.post('/generations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const parsed = createGenerationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const userId = request.user.sub;

    // Pro subscribers get unlimited generations — skip credit check
    const activeSub = await Subscription.findOne({
      userId,
      tier: 'pro',
      status: { $in: ['active', 'trialing'] },
    }).lean();
    const isPro = Boolean(activeSub);

    if (!isPro) {
      // Check and deduct credits for free-tier users
      const creditDoc = await CreditBalance.findOne({ userId });
      const balance = creditDoc?.balance ?? 0;
      if (balance < config.CREDITS_PER_GENERATION) {
        return reply.status(402).send({
          error: 'Insufficient credits',
          upgradeUrl: '/settings/billing',
        });
      }

      await CreditBalance.findOneAndUpdate(
        { userId },
        { $inc: { balance: -config.CREDITS_PER_GENERATION } },
      );
    }

    // Create job record
    const job = await Generation.create({
      userId,
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspectRatio,
      durationSeconds: parsed.data.durationSeconds,
      status: 'queued',
    });

    // Record credit transaction for free-tier users only
    if (!isPro) {
      await CreditTransaction.create({
        userId,
        amount: -config.CREDITS_PER_GENERATION,
        type: 'debit',
        description: `Video generation: ${parsed.data.prompt.slice(0, 50)}`,
        generationId: job._id,
      });
    }

    capture(userId, 'video_generation_started', {
      jobId: job._id.toString(),
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspectRatio,
      durationSeconds: parsed.data.durationSeconds,
      isPro,
    });

    // Submit to fal.ai asynchronously — don't block the response
    submitGeneration(parsed.data)
      .then(async (result) => {
        await Generation.findByIdAndUpdate(job._id, {
          externalJobId: result.externalJobId,
          status: result.status,
        });
      })
      .catch(async (err: unknown) => {
        console.error('Generation submission failed:', err);
        await Generation.findByIdAndUpdate(job._id, {
          status: 'failed',
          errorMessage: String(err),
        });
        // Refund credits on submission failure (free-tier only)
        if (!isPro) {
          await CreditBalance.findOneAndUpdate(
            { userId },
            { $inc: { balance: config.CREDITS_PER_GENERATION } },
          );
          await CreditTransaction.create({
            userId,
            amount: config.CREDITS_PER_GENERATION,
            type: 'refund',
            description: 'Refund: generation submission failed',
            generationId: job._id,
          });
        }
      });

    return reply.status(202).send({
      jobId: job._id.toString(),
      status: job.status,
      prompt: job.prompt,
      createdAt: job.createdAt,
    });
  });

  /** GET /generations — list the authenticated user's generation jobs */
  fastify.get('/generations', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const userId = request.user.sub;
    const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(query['pageSize'] ?? '20', 10)));
    const statusFilter = query['status'];

    const filter: Record<string, unknown> = { userId };
    if (statusFilter && ['queued', 'processing', 'completed', 'failed'].includes(statusFilter)) {
      filter['status'] = statusFilter;
    }

    const [total, docs] = await Promise.all([
      Generation.countDocuments(filter),
      Generation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
    ]);

    return reply.status(200).send({
      data: docs.map((d) => ({
        jobId: d._id.toString(),
        status: d.status,
        prompt: d.prompt,
        aspectRatio: d.aspectRatio,
        durationSeconds: d.durationSeconds,
        createdAt: d.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  });

  /** GET /generations/:id — get a single generation job, with background status sync */
  fastify.get(
    '/generations/:id',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (!mongoose.isValidObjectId(id)) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const job = await Generation.findOne({ _id: id, userId: request.user.sub });
      if (!job) {
        return reply.status(404).send({ error: 'Not found' });
      }

      // If still in progress, try to poll for an update
      if ((job.status === 'queued' || job.status === 'processing') && job.externalJobId) {
        try {
          const result = await pollGeneration(job.externalJobId);
          if (result.status !== job.status) {
            if (result.status === 'completed') {
              capture(request.user.sub, 'video_generation_completed', {
                jobId: job._id.toString(),
                prompt: job.prompt,
                aspectRatio: job.aspectRatio,
                durationSeconds: job.durationSeconds,
              });
            }
            const updateData: Record<string, unknown> = { status: result.status };
            if (result.status === 'completed' && result.videoUrl) {
              // Download and re-upload to R2 for permanent storage
              const key = `videos/${job._id.toString()}.mp4`;
              try {
                const videoRes = await fetch(result.videoUrl);
                const buf = Buffer.from(await videoRes.arrayBuffer());
                await uploadToR2(key, buf, 'video/mp4');
                updateData['r2Key'] = key;
              } catch {
                // R2 upload failed — store external URL as fallback key marker
                updateData['r2Key'] = result.videoUrl;
              }
            }
            await Generation.findByIdAndUpdate(job._id, updateData);
            job.status = result.status as typeof job.status;
            if (updateData['r2Key']) job.r2Key = updateData['r2Key'] as string;
          }
        } catch {
          // Poll failure is non-fatal; return cached status
        }
      }

      return reply.status(200).send({
        jobId: job._id.toString(),
        status: job.status,
        prompt: job.prompt,
        aspectRatio: job.aspectRatio,
        durationSeconds: job.durationSeconds,
        createdAt: job.createdAt,
      });
    },
  );

  /** GET /generations/:id/url — get a signed playback URL for a completed video */
  fastify.get(
    '/generations/:id/url',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      if (!mongoose.isValidObjectId(id)) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const job = await Generation.findOne({ _id: id, userId: request.user.sub });
      if (!job) {
        return reply.status(404).send({ error: 'Not found' });
      }

      if (job.status !== 'completed' || !job.r2Key) {
        return reply.status(404).send({ error: 'Video not yet available' });
      }

      // If r2Key looks like an HTTP URL (fallback path), return it directly
      if (job.r2Key.startsWith('http')) {
        return reply.status(200).send({
          url: job.r2Key,
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        });
      }

      const url = await getSignedDownloadUrl(job.r2Key, 3600);
      return reply.status(200).send({
        url,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      });
    },
  );
}
