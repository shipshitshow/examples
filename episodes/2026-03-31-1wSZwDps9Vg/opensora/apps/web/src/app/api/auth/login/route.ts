import bcrypt from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { signToken } from '@/lib/api-auth';
import { connectDb } from '@/lib/db';
import { User } from '@/models/user';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const accessToken = await signToken({ sub: user._id.toString(), email: user.email });

  return NextResponse.json({
    accessToken,
    user: { id: user._id.toString(), email: user.email, createdAt: user.createdAt },
  });
}
