import type { FastifyInstance } from 'fastify';

import { CreditBalance, CreditTransaction } from '../models/credit.js';

export async function creditRoutes(fastify: FastifyInstance): Promise<void> {
  /** GET /credits/balance */
  fastify.get(
    '/credits/balance',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const doc = await CreditBalance.findOne({ userId: request.user.sub }).lean();
      return reply.status(200).send({
        balance: doc?.balance ?? 0,
        currency: 'credits',
        userId: request.user.sub,
      });
    },
  );

  /** GET /credits/transactions */
  fastify.get(
    '/credits/transactions',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const query = request.query as Record<string, string | undefined>;
      const page = Math.max(1, parseInt(query['page'] ?? '1', 10));
      const pageSize = Math.min(50, Math.max(1, parseInt(query['pageSize'] ?? '20', 10)));

      const filter = { userId: request.user.sub };

      const [total, docs] = await Promise.all([
        CreditTransaction.countDocuments(filter),
        CreditTransaction.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
      ]);

      return reply.status(200).send({
        data: docs.map((t) => ({
          id: t._id.toString(),
          amount: t.amount,
          type: t.type,
          description: t.description,
          createdAt: t.createdAt,
        })),
        total,
        page,
        pageSize,
      });
    },
  );
}
