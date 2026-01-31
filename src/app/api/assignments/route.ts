import { NextResponse } from 'next/server';
import { listAssignments } from '@/lib/specs';

// GET /api/assignments - List all assignments
export async function GET() {
  try {
    const assignments = listAssignments();
    
    // Return just the array for simpler consumption
    return NextResponse.json(assignments);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
