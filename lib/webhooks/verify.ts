// Vercel Webhook Signature Verification
// See 11-phase2-automation.md for full specification

import crypto from 'crypto';
import { NextRequest } from 'next/server';

export async function verifyVercelSignature(
  req: NextRequest
): Promise<boolean> {
  const signature = req.headers.get('x-vercel-signature');
  if (!signature) return false;

  const body = await req.text();
  const expected = crypto
    .createHmac('sha1', process.env.VERCEL_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  return signature === expected;
}

// Made with Bob
