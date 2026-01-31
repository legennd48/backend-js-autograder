import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student } from '@/lib/models';
import { checkGitHubPathExists, checkRepoExists } from '@/lib/github';
import { getAssignment, getRepoCheckAssignment, specs } from '@/lib/specs';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    await connectDB();
    const body = await request.json();

    const { studentId, week, session } = body as {
      studentId?: string;
      week?: number;
      session?: number;
    };

    if (!studentId || !week || !session) {
      return NextResponse.json(
        { error: 'studentId, week, and session are required' },
        { status: 400 }
      );
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const owner = student.githubUsername;
    const repoName = specs.course.repoName;

    const repoExists = await checkRepoExists(owner, repoName);
    if (!repoExists) {
      return NextResponse.json(
        {
          error: `Repository not found: ${owner}/${repoName}`,
          preview: {
            owner,
            repoName,
            repoExists: false,
            durationMs: Date.now() - startedAt,
            checks: []
          }
        },
        { status: 404 }
      );
    }

    const checks: Array<{
      label: string;
      path: string;
      exists: boolean;
    }> = [];

    // Week 1 Session 1: repo + README existence
    if (week === 1 && session === 1) {
      const readmeMd = await checkGitHubPathExists(owner, repoName, 'README.md');
      const readmeLower = readmeMd
        ? false
        : await checkGitHubPathExists(owner, repoName, 'readme.md');

      checks.push({
        label: 'README exists',
        path: readmeMd ? 'README.md' : 'readme.md',
        exists: readmeMd || readmeLower
      });

      return NextResponse.json({
        preview: {
          owner,
          repoName,
          repoExists: true,
          durationMs: Date.now() - startedAt,
          checks
        }
      });
    }

    const repoCheck = getRepoCheckAssignment(week, session);
    if (repoCheck) {
      for (const check of repoCheck.checks) {
        const exists = await checkGitHubPathExists(owner, repoName, check.path);
        checks.push({ label: check.label, path: check.path, exists });
      }

      return NextResponse.json({
        preview: {
          owner,
          repoName,
          repoExists: true,
          durationMs: Date.now() - startedAt,
          checks
        }
      });
    }

    const assignment = getAssignment(week, session);
    if (!assignment) {
      return NextResponse.json(
        { error: `No assignment found for week ${week} session ${session}` },
        { status: 404 }
      );
    }

    for (const file of assignment.files) {
      const filePath = `${assignment.path}/${file.filename}`;
      const exists = await checkGitHubPathExists(owner, repoName, filePath);
      checks.push({ label: 'Required file', path: filePath, exists });
    }

    return NextResponse.json({
      preview: {
        owner,
        repoName,
        repoExists: true,
        durationMs: Date.now() - startedAt,
        checks
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Preview check failed' },
      { status: 500 }
    );
  }
}
