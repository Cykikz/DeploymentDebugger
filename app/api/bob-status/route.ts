import { NextResponse } from 'next/server';
import { getBobStatus } from '@/lib/bob-client';

export async function GET() {
  const status = getBobStatus();
  return NextResponse.json(status);
}

// Made with Bob
