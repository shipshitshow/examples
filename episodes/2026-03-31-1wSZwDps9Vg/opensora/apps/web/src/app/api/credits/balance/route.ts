import { type NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { CreditBalance } from '@/models/credit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await connectDb();

  const doc = await CreditBalance.findOne({ userId: auth.payload.sub }).lean();

  return NextResponse.json({
    balance: doc?.balance ?? 0,
    currency: 'credits',
    userId: auth.payload.sub,
  });
}
