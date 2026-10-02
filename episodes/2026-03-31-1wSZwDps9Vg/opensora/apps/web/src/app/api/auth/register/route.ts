import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signToken } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { User } from '@/models/user';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const FREE_CREDITS = Number(process.env['FREE_CREDITS_ON_SIGNUP'] ?? 10);
const CREDITS_PER_GENERATION = Number(process.env['CREDITS_PER_GENERATION'] ?? 1);

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();

  const existing = await User.findOne({ email: parsed.data.email }).lean();
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({ email: parsed.data.email, passwordHash });

  // Provision free credits — lazy import to avoid circular deps
  const { CreditBalance } = await import('@/models/credit');
  await CreditBalance.create({ userId: user._id, balance: FREE_CREDITS });

  // Record signup credit transaction
  const { CreditTransaction } = await import('@/models/credit');
  await CreditTransaction.create({
    userId: user._id,
    amount: FREE_CREDITS,
    type: 'credit',
    description: `Welcome bonus: ${FREE_CREDITS} free generations`,
  });

  void CREDITS_PER_GENERATION; // referenced in generations route

  const accessToken = await signToken({ sub: user._id.toString(), email: user.email });

  return NextResponse.json(
    {
      accessToken,
      user: { id: user._id.toString(), email: user.email, createdAt: user.createdAt },
    },
    { status: 201 },
  );
}
