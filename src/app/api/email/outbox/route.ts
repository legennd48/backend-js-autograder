import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { EmailOutbox } from '@/lib/models';

export const runtime = 'nodejs';

// GET /api/email/outbox?status=pending&limit=50
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.max(1, Math.min(200, Number(searchParams.get('limit') || 50)));

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const items = await EmailOutbox.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const summaryAgg = await EmailOutbox.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summary: Record<string, number> = { pending: 0, processing: 0, sent: 0, canceled: 0 };
    for (const row of summaryAgg) {
      summary[String(row._id)] = Number(row.count || 0);
    }

    return NextResponse.json({ summary, items });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch email outbox' },
      { status: 500 }
    );
  }
}
