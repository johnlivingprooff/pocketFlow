import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureWaitlistTable } from './db';
import { betaWhatsappUrl } from '@/lib/links';
import { sendWaitlistWelcomeEmail } from '@/lib/waitlistEmail';

type WaitlistPayload = {
  email?: unknown;
  fullname?: unknown;
};

function isDuplicateError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message).toLowerCase() : '';

  return code === '23505' || message.includes('duplicate');
}

export async function POST(request: NextRequest) {
  try {
    await ensureWaitlistTable();

    const body = (await request.json()) as WaitlistPayload;
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const fullname = typeof body.fullname === 'string' ? body.fullname.trim() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!fullname || fullname.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }

    try {
      await sql`
        INSERT INTO waitlist (email, fullname)
        VALUES (${email}, ${fullname})
      `;
    } catch (error: unknown) {
      if (isDuplicateError(error)) {
        return NextResponse.json(
          {
            message:
              'This email is already on the waitlist. You can join the beta-test WhatsApp group for early access now.',
          },
          { status: 200 }
        );
      }

      throw error;
    }

    try {
      await sendWaitlistWelcomeEmail({
        email,
        fullname,
        betaWhatsappUrl,
      });
    } catch (error) {
      console.error('Waitlist welcome email error:', error);

      return NextResponse.json(
        {
          message:
            'You are on the waitlist, but we could not send your welcome email right now. Please join the beta-test WhatsApp group directly for early access.',
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        message:
          'You are on the waitlist. Check your inbox for a welcome email from admin@eiteone.org with project details and beta access steps.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
