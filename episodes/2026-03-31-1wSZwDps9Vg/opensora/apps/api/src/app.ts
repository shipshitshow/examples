import Fastify from 'fastify';

import { authPlugin } from './plugins/auth.js';
import { corsPlugin } from './plugins/cors.js';
import { authRoutes } from './routes/auth.js';
import { creditRoutes } from './routes/credits.js';
import { generationRoutes } from './routes/generations.js';
import { healthRoutes } from './routes/health.js';
import { paymentRoutes } from './routes/payments.js';
import { userRoutes } from './routes/users.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
    // Preserve raw body for Stripe webhook signature verification
    bodyLimit: 1_048_576,
  });

  // Store raw body for webhook signature verification
  fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    try {
      const rawBody = body as Buffer;
      const parsed = JSON.parse(rawBody.toString()) as unknown;
      (_req as unknown as Record<string, unknown>)['rawBody'] = rawBody;
      done(null, parsed);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Plugins
  await fastify.register(corsPlugin);
  await fastify.register(authPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(generationRoutes);
  await fastify.register(creditRoutes);
  await fastify.register(paymentRoutes);

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'Internal server error' : error.message,
    });
  });

  return fastify;
}
