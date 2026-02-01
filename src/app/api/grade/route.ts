import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student, Submission } from '@/lib/models';
import { checkGitHubPathExists, fetchGitHubFile, checkRepoExists } from '@/lib/github';
import { gradeAssignment, GradeResult } from '@/lib/grader';
import { getApiAssignment, getAssignment, getRepoCheckAssignment, specs } from '@/lib/specs';
import { enqueueGradeReportEmail } from '@/lib/emailOutbox';

export const runtime = 'nodejs';

// POST /api/grade - Grade a student's assignment
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { studentId, week, session } = body;

    if (!studentId || !week || !session) {
      return NextResponse.json(
        { error: 'studentId, week, and session are required' },
        { status: 400 }
      );
    }

    // Get student
    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Create or update submission record
    let submission = await Submission.findOne({
      studentId,
      week,
      session
    });

    if (!submission) {
      submission = new Submission({
        studentId,
        week,
        session,
        status: 'grading'
      });
    } else {
      submission.status = 'grading';
      submission.submittedAt = new Date();
    }

    await submission.save();

    // Get assignment spec
    const repoCheck = getRepoCheckAssignment(week, session);
    const assignment = getAssignment(week, session);
    if (!assignment && !repoCheck) {
      const apiAssignment = getApiAssignment(week, session);
      if (apiAssignment) {
        submission.status = 'error';
        submission.errorMessage = 'This is an API assignment and is not auto-graded yet.';
        submission.score = 0;
        submission.maxScore = 0;
        submission.results = [];
        await submission.save();

        return NextResponse.json(
          {
            error: submission.errorMessage,
            message: 'API assignment auto-grading is not implemented yet.',
            submission,
          },
          { status: 501 }
        );
      }

      submission.status = 'error';
      submission.errorMessage = `No assignment spec found for week ${week} session ${session}`;
      submission.score = 0;
      submission.maxScore = 0;
      submission.results = [];
      await submission.save();

      return NextResponse.json(
        { error: submission.errorMessage, submission },
        { status: 404 }
      );
    }

    // Check repository exists before grading
    const repoExists = await checkRepoExists(student.githubUsername, specs.course.repoName);
    if (!repoExists) {
      submission.status = 'error';
      submission.errorMessage = `Repository not found: ${student.githubUsername}/${specs.course.repoName}`;
      submission.score = 0;
      submission.maxScore = 0;
      submission.results = [];
      await submission.save();

      return NextResponse.json(
        { error: submission.errorMessage, submission },
        { status: 404 }
      );
    }

    try {
      let totalScore = 0;
      let totalMaxScore = 0;
      const allResults: any[] = [];

      // Week 1 Session 1: Repository setup checks (repo exists + README)
      if (week === 1 && session === 1) {
        totalMaxScore = 2;

        allResults.push({
          functionName: 'repoExists',
          testIndex: 0,
          passed: true,
          input: [],
          expected: true,
          actual: true
        });
        totalScore++;

        let readmeContent: string | null = null;
        try {
          readmeContent = await fetchGitHubFile(
            student.githubUsername,
            specs.course.repoName,
            'README.md'
          );
        } catch {
          readmeContent = null;
        }

        if (!readmeContent) {
          try {
            readmeContent = await fetchGitHubFile(
              student.githubUsername,
              specs.course.repoName,
              'readme.md'
            );
          } catch {
            readmeContent = null;
          }
        }

        const readmeExists = !!readmeContent;
        allResults.push({
          functionName: 'readmeExists',
          testIndex: 1,
          passed: readmeExists,
          input: [],
          expected: true,
          actual: readmeExists,
          error: readmeExists ? undefined : 'README.md not found in repo root'
        });

        if (readmeExists) totalScore++;

        submission.status = 'completed';
        submission.score = totalScore;
        submission.maxScore = totalMaxScore;
        submission.results = allResults;
        await submission.save();

        try {
          await enqueueGradeReportEmail({
            student: { _id: student._id, name: student.name, email: student.email },
            submission
          });
        } catch (err) {
          console.error('Grade email enqueue failed', err);
        }

        return NextResponse.json({
          message: 'Grading complete',
          submission: {
            id: submission._id,
            week,
            session,
            score: totalScore,
            maxScore: totalMaxScore,
            percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
            results: allResults
          }
        });
      }
      if (repoCheck) {
        totalMaxScore = repoCheck.checks.length;

        for (let i = 0; i < repoCheck.checks.length; i++) {
          const check = repoCheck.checks[i];
          const exists = await checkGitHubPathExists(
            student.githubUsername,
            specs.course.repoName,
            check.path
          );

          allResults.push({
            functionName: 'repoCheck',
            testIndex: i,
            passed: exists,
            input: [check.path],
            expected: true,
            actual: exists,
            error: exists ? undefined : `Missing required path: ${check.path}`
          });

          if (exists) totalScore++;
        }

        submission.status = 'completed';
        submission.score = totalScore;
        submission.maxScore = totalMaxScore;
        submission.results = allResults;
        await submission.save();

        try {
          await enqueueGradeReportEmail({
            student: { _id: student._id, name: student.name, email: student.email },
            submission
          });
        } catch (err) {
          console.error('Grade email enqueue failed', err);
        }

        return NextResponse.json({
          message: 'Grading complete',
          submission: {
            id: submission._id,
            week,
            session,
            score: totalScore,
            maxScore: totalMaxScore,
            percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
            results: allResults
          }
        });
      }

      if (!assignment) {
        throw new Error(`No function assignment spec found for week ${week} session ${session}`);
      }

      // Process each file in the assignment
      for (const file of assignment.files) {
        const filePath = `${assignment.path}/${file.filename}`;
        
        // Fetch code from GitHub
        const code = await fetchGitHubFile(
          student.githubUsername,
          specs.course.repoName,
          filePath
        );

        if (!code) {
          // File not found - mark all tests as failed
          for (const func of file.functions) {
            if (func.skipAutoTest) continue;
            
            for (let i = 0; i < func.tests.length; i++) {
              totalMaxScore++;
              allResults.push({
                functionName: func.name,
                testIndex: i,
                passed: false,
                input: func.tests[i].input,
                expected: func.tests[i].expected,
                error: `File not found: ${filePath}`
              });
            }
          }
          continue;
        }

        // Grade the code
        const result: GradeResult = gradeAssignment(code, file.functions);
        totalScore += result.score;
        totalMaxScore += result.maxScore;
        allResults.push(...result.results);
      }

      // Update submission with results
      submission.status = 'completed';
      submission.score = totalScore;
      submission.maxScore = totalMaxScore;
      submission.results = allResults;
      await submission.save();

      try {
        await enqueueGradeReportEmail({
          student: { _id: student._id, name: student.name, email: student.email },
          submission
        });
      } catch (err) {
        console.error('Grade email enqueue failed', err);
      }

      return NextResponse.json({
        message: 'Grading complete',
        submission: {
          id: submission._id,
          week,
          session,
          score: totalScore,
          maxScore: totalMaxScore,
          percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
          results: allResults
        }
      });
    } catch (error: any) {
      // Update submission with error
      submission.status = 'error';
      submission.errorMessage = error.message;
      await submission.save();

      return NextResponse.json(
        { error: `Grading failed: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Grading failed' },
      { status: 500 }
    );
  }
}

// GET /api/grade - Get all submissions (with optional filters)
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const week = searchParams.get('week');
    const session = searchParams.get('session');
    const status = searchParams.get('status');

    const filter: Record<string, any> = {};
    
    if (studentId) filter.studentId = studentId;
    if (week) filter.week = parseInt(week);
    if (session) filter.session = parseInt(session);

    const submissions = await Submission.find(filter)
      .populate('studentId', 'name email githubUsername')
      .sort({ submittedAt: -1 })
      .lean();

    const normalized = submissions.map((s: any) => {
      const maxScore = Number(s.maxScore || 0);
      const score = Number(s.score || 0);
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      let derivedStatus: 'passed' | 'failed' | 'error' = 'failed';
      if (s.status === 'error') derivedStatus = 'error';
      else if (s.status !== 'completed') derivedStatus = 'error';
      else derivedStatus = percentage === 100 ? 'passed' : 'failed';

      return {
        ...s,
        percentage,
        status: derivedStatus,
        gradedAt: s.submittedAt || s.createdAt || new Date()
      };
    });

    const filtered = status
      ? normalized.filter((s: any) => s.status === status)
      : normalized;

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
