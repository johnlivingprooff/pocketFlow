import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureWaitlistTable } from './db';

export async function POST(request: NextRequest) {
  try {
    // Ensure table exists
    await ensureWaitlistTable();

    const { email, fullname } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!fullname || typeof fullname !== 'string' || fullname.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required and must be at least 2 characters' }, { status: 400 });
    }

    const trimmedEmail = email.trim();
    const trimmedFullname = fullname.trim();

    try {
      // Try to insert into database
      await sql`
        INSERT INTO waitlist (email, fullname)
        VALUES (${trimmedEmail}, ${trimmedFullname})
      `;
      return NextResponse.json({ message: 'Successfully added to waitlist' }, { status: 200 });
    } catch (error: any) {
      // Check if it's a unique constraint violation (email already exists)
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        return NextResponse.json({ message: 'Email already on waitlist' }, { status: 200 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}