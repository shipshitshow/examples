import type { FastifyInstance, FastifyRequest } from 'fastify';
import Stripe from 'stripe';

import { config } from '../config.js';
import { Subscription } from '../models/subscription.js';
import { User } from '../models/user.js';
import { capture } from '../services/posthog.js';

function getStripe(): Stripe {
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(config.STRIPE_SECRET_KEY);
}

/** Resolve or create a Stripe customer for the authenticated user */
async function getOrCreateCustomer(stripe: Stripe, userId: string, email: string): Promise<string> {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

export async function paymentRoutes(fastify: FastifyInstance): Promise<void> {
  /** POST /payments/checkout — create a Stripe Checkout session for the Pro plan */
  fastify.post(
    '/payments/checkout',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!config.STRIPE_SECRET_KEY || !config.STRIPE_PRO_PRICE_ID) {
        return reply.status(503).send({ error: 'Payments not configured' });
      }

      const stripe = getStripe();
      const userId = request.user.sub;
      const email = request.user.email;

      const customerId = await getOrCreateCustomer(stripe, userId, email);

      // Check for existing active subscription
      const existing = await Subscription.findOne({
        userId,
        status: { $in: ['active', 'trialing'] },
      });
      if (existing) {
        return reply.status(409).send({ error: 'Already subscribed to Pro' });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: config.STRIPE_PRO_PRICE_ID, quantity: 1 }],
        success_url: `${config.APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=1`,
        cancel_url: `${config.APP_URL}/settings/billing?canceled=1`,
        subscription_data: {
          metadata: { userId },
        },
      });

      return reply.status(200).send({ url: session.url, sessionId: session.id });
    },
  );

  /** POST /payments/portal — create a Stripe Billing Portal session */
  fastify.post(
    '/payments/portal',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      if (!config.STRIPE_SECRET_KEY) {
        return reply.status(503).send({ error: 'Payments not configured' });
      }

      const stripe = getStripe();
      const userId = request.user.sub;
      const email = request.user.email;

      const customerId = await getOrCreateCustomer(stripe, userId, email);

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${config.APP_URL}/settings/billing`,
      });

      return reply.status(200).send({ url: portalSession.url });
    },
  );

  /** GET /payments/subscription — get the current user's subscription status */
  fastify.get(
    '/payments/subscription',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const sub = await Subscription.findOne({ userId: request.user.sub }).lean();

      if (!sub) {
        return reply.status(200).send({ tier: 'free', status: null });
      }

      return reply.status(200).send({
        tier: sub.tier,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      });
    },
  );

  /** POST /payments/webhook — handle Stripe webhook events */
  fastify.post(
    '/payments/webhook',
    {
      config: { rawBody: true },
    },
    async (request: FastifyRequest, reply) => {
      if (!config.STRIPE_SECRET_KEY || !config.STRIPE_WEBHOOK_SECRET) {
        return reply.status(503).send({ error: 'Payments not configured' });
      }

      const stripe = getStripe();
      const sig = request.headers['stripe-signature'] as string;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          (request as FastifyRequest & { rawBody: Buffer }).rawBody,
          sig,
          config.STRIPE_WEBHOOK_SECRET,
        );
      } catch {
        return reply.status(400).send({ error: 'Invalid webhook signature' });
      }

      await handleStripeEvent(stripe, event);

      return reply.status(200).send({ received: true });
    },
  );
}

async function handleStripeEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode !== 'subscription' || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await upsertSubscription(subscription);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await upsertSubscription(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        { status: 'canceled', cancelAtPeriodEnd: false },
      );
      break;
    }

    default:
      break;
  }
}

async function upsertSubscription(subscription: Stripe.Subscription): Promise<void> {
  const userId: string | undefined =
    (subscription.metadata?.['userId'] as string | undefined) ??
    (await resolveUserIdFromCustomer(subscription.customer as string));

  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id ?? '';
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  if (isActive && (subscription.status === 'active' || subscription.status === 'trialing')) {
    capture(userId, 'subscription_started', {
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      tier: 'pro',
    });
  }

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      tier: isActive ? 'pro' : 'free',
      status: subscription.status as Subscription['status'],
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    { upsert: true, new: true },
  );
}

async function resolveUserIdFromCustomer(customerId: string): Promise<string | undefined> {
  const user = await User.findOne({ stripeCustomerId: customerId }).lean();
  return user?._id.toString();
}
