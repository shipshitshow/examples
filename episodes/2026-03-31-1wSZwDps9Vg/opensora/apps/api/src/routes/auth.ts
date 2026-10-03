import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { CreditBalance, CreditTransaction } from '../models/credit.js';
import { User } from '../models/user.js';
import { capture } from '../services/posthog.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { email, password, displayName } = parsed.data;

    const existing = await User.findOne({ email });
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, displayName });

    // Grant free trial credits
    await CreditBalance.create({ userId: user._id, balance: config.FREE_CREDITS_ON_SIGNUP });
    await CreditTransaction.create({
      userId: user._id,
      amount: config.FREE_CREDITS_ON_SIGNUP,
      type: 'credit',
      description: 'Welcome bonus credits',
    });

    const accessToken = fastify.jwt.sign({ sub: user._id.toString(), email: user.email });

    capture(user._id.toString(), 'sign_up', { email: user.email, displayName: user.displayName });

    return reply.status(201).send({
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      },
    });
  });

  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const accessToken = fastify.jwt.sign({ sub: user._id.toString(), email: user.email });

    return reply.status(200).send({
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
      },
    });
  });
}
