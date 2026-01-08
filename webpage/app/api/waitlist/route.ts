import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const WAITLIST_FILE = path.join(process.cwd(), 'waitlist.json');

interface WaitlistEntry {
  email: string;
  fullname: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { email, fullname } = await request.json();

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!fullname || typeof fullname !== 'string' || fullname.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required and must be at least 2 characters' }, { status: 400 });
    }

    // Read existing waitlist or create empty array
    let waitlist: WaitlistEntry[] = [];
    try {
      const data = await fs.readFile(WAITLIST_FILE, 'utf8');
      waitlist = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
    }

    // Check if email already exists
    const existingEntry = waitlist.find(entry => entry.email === email);
    if (existingEntry) {
      return NextResponse.json({ message: 'Email already on waitlist' }, { status: 200 });
    }

    // Add new entry
    const newEntry: WaitlistEntry = {
      email,
      fullname: fullname.trim(),
      timestamp: new Date().toISOString(),
    };
    waitlist.push(newEntry);

    // Write back to file
    await fs.writeFile(WAITLIST_FILE, JSON.stringify(waitlist, null, 2));

    return NextResponse.json({ message: 'Successfully added to waitlist' }, { status: 200 });
  } catch (error) {
    console.error('Waitlist API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}