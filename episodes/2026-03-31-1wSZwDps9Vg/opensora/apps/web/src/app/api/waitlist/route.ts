import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  // TODO: persist to DB / send to Resend/Mailchimp
  console.warn('Waitlist signup (TODO: persist):', parsed.data.email);

  return NextResponse.json({ message: 'Added to waitlist' }, { status: 201 });
}
