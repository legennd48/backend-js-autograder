import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { processEmailOutboxBatch } from '@/lib/emailOutbox';

export const runtime = 'nodejs';

// POST /api/email/outbox/process
// Body: { limit?: number }
// Auth is enforced by middleware (same as other admin APIs).
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json().catch(() => ({}));
    const limit = Number(body?.limit || 20);

    const summary = await processEmailOutboxBatch({ limit });

    return NextResponse.json({ message: 'Processed email outbox', summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process email outbox' },
      { status: 500 }
    );
  }
}
