import { type NextRequest, NextResponse } from 'next/server';

import { requireAuth } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { User } from '@/models/user';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await connectDb();

  const user = await User.findById(auth.payload.sub).lean();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  });
}
