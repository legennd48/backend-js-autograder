import { NextRequest, NextResponse } from 'next/server';
import { getAssignment, getApiAssignment, getRepoCheckAssignment, specs } from '@/lib/specs';

interface RouteParams {
  params: Promise<{ weekSession: string }>;
}

// GET /api/assignments/[weekSession] - Get specific assignment details
// weekSession format: "2-3" for week 2, session 3
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { weekSession } = await params;
    const parts = weekSession.split('-');
    
    if (parts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid format. Use week-session (e.g., 2-3)' },
        { status: 400 }
      );
    }

    const week = parseInt(parts[0]);
    const session = parseInt(parts[1]);

    if (isNaN(week) || isNaN(session)) {
      return NextResponse.json(
        { error: 'Week and session must be numbers' },
        { status: 400 }
      );
    }

    // Try to find function assignment first
    const assignment = getAssignment(week, session);
    
    if (assignment) {
      return NextResponse.json({
        type: 'function',
        repoName: specs.course.repoName,
        ...assignment
      });
    }

    // Try API assignment
    const apiAssignment = getApiAssignment(week, session);
    
    if (apiAssignment) {
      return NextResponse.json({
        type: 'api',
        repoName: specs.course.repoName,
        ...apiAssignment
      });
    }

    // Try repo-check assignment
    const repoCheckAssignment = getRepoCheckAssignment(week, session);

    if (repoCheckAssignment) {
      return NextResponse.json({
        type: 'repo-check',
        repoName: specs.course.repoName,
        ...repoCheckAssignment
      });
    }

    return NextResponse.json(
      { error: `No assignment found for week ${week} session ${session}` },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}
