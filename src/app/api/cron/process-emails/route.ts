import { NextRequest, NextResponse } from 'next/server';
import { processEmailOutboxBatch } from '@/lib/emailOutbox';
import { connectDB } from '@/lib/mongodb';

export const runtime = 'nodejs';

// GET /api/cron/process-emails?secret=...&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || '';
    const limit = Number(searchParams.get('limit') || 20);

    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return NextResponse.json(
        { error: 'CRON_SECRET is not configured on the server' },
        { status: 500 }
      );
    }

    if (secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const summary = await processEmailOutboxBatch({ limit });

    return NextResponse.json({ message: 'Processed email outbox', summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process email outbox' },
      { status: 500 }
    );
  }
}
