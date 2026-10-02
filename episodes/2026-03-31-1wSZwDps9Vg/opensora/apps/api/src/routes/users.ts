import type { FastifyInstance } from 'fastify';

import { User } from '../models/user.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/users/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.sub).lean();
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return reply.status(200).send({
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    });
  });
}
