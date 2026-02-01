import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student, Submission } from '@/lib/models';
import { checkGitHubPathExists, fetchGitHubFile, checkRepoExists } from '@/lib/github';
import { gradeAssignment, GradeResult } from '@/lib/grader';
import { getApiAssignment, getAssignment, getRepoCheckAssignment, specs } from '@/lib/specs';

interface GradeResultItem {
  studentId: string;
  studentName: string;
  githubUsername: string;
  status: 'passed' | 'failed' | 'error' | 'not-submitted';
  score: number;
  maxScore: number;
  percentage: number;
  errorMessage?: string;
}

// POST /api/grade/batch - Grade assignment for all students
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { week, session } = body;

    if (!week || !session) {
      return NextResponse.json(
        { error: 'week and session are required' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const repoCheck = getRepoCheckAssignment(week, session);
    const assignment = getAssignment(week, session);
    
    if (!assignment && !repoCheck) {
      const apiAssignment = getApiAssignment(week, session);
      if (apiAssignment) {
        return NextResponse.json(
          {
            error:
              'Batch grading is not implemented for API assignments yet. Select a function or repo-check assignment.',
            type: 'api',
            week,
            session
          },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: `No assignment spec found for week ${week} session ${session}` },
        { status: 404 }
      );
    }

    // Get all active students
    const students = await Student.find({ isActive: true }).lean();
    
    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No active students found' },
        { status: 404 }
      );
    }

    const results: GradeResultItem[] = [];

    for (const student of students) {
      const studentId =
        (student as any)?._id?.toString?.() ?? String((student as any)?._id ?? '');

      const studentResult: GradeResultItem = {
        studentId,
        studentName: student.name,
        githubUsername: student.githubUsername,
        status: 'error',
        score: 0,
        maxScore: 0,
        percentage: 0
      };

      try {
        // Create or update submission record
        let submission = await Submission.findOne({
          studentId: student._id,
          week,
          session
        });

        if (!submission) {
          submission = new Submission({
            studentId: student._id,
            week,
            session,
            status: 'grading'
          });
        } else {
          submission.status = 'grading';
          submission.submittedAt = new Date();
        }
        await submission.save();

        // Check repository exists
        const repoExists = await checkRepoExists(student.githubUsername, specs.course.repoName);
        if (!repoExists) {
          submission.status = 'error';
          submission.errorMessage = `Repository not found: ${student.githubUsername}/${specs.course.repoName}`;
          submission.score = 0;
          submission.maxScore = 0;
          submission.results = [];
          await submission.save();

          studentResult.status = 'not-submitted';
          studentResult.errorMessage = 'Repository not found';
          results.push(studentResult);
          continue;
        }

        let totalScore = 0;
        let totalMaxScore = 0;
        const allResults: any[] = [];

        // Week 1 Session 1: Repository setup checks
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
            readmeContent = await fetchGitHubFile(student.githubUsername, specs.course.repoName, 'README.md');
          } catch { readmeContent = null; }
          if (!readmeContent) {
            try {
              readmeContent = await fetchGitHubFile(student.githubUsername, specs.course.repoName, 'readme.md');
            } catch { readmeContent = null; }
          }

          const readmeExists = !!readmeContent;
          allResults.push({
            functionName: 'readmeExists',
            testIndex: 1,
            passed: readmeExists,
            input: [],
            expected: true,
            actual: readmeExists,
            error: readmeExists ? undefined : 'README.md not found'
          });
          if (readmeExists) totalScore++;

          submission.status = 'completed';
          submission.score = totalScore;
          submission.maxScore = totalMaxScore;
          submission.results = allResults;
          await submission.save();

          studentResult.score = totalScore;
          studentResult.maxScore = totalMaxScore;
          studentResult.percentage = Math.round((totalScore / totalMaxScore) * 100);
          studentResult.status = studentResult.percentage === 100 ? 'passed' : 'failed';
          results.push(studentResult);
          continue;
        }

        // Repo-check assignments
        if (repoCheck) {
          totalMaxScore = repoCheck.checks.length;
          let allFound = true;

          for (let i = 0; i < repoCheck.checks.length; i++) {
            const check = repoCheck.checks[i];
            const exists = await checkGitHubPathExists(student.githubUsername, specs.course.repoName, check.path);

            allResults.push({
              functionName: 'repoCheck',
              testIndex: i,
              passed: exists,
              input: [check.path],
              expected: true,
              actual: exists,
              error: exists ? undefined : `Missing: ${check.path}`
            });

            if (exists) totalScore++;
            else allFound = false;
          }

          // Check if no files were found at all (not submitted)
          if (totalScore === 0) {
            submission.status = 'error';
            submission.errorMessage = 'No required files found - assignment not submitted';
            submission.score = 0;
            submission.maxScore = totalMaxScore;
            submission.results = allResults;
            await submission.save();

            studentResult.status = 'not-submitted';
            studentResult.maxScore = totalMaxScore;
            studentResult.errorMessage = 'Assignment not submitted';
            results.push(studentResult);
            continue;
          }

          submission.status = 'completed';
          submission.score = totalScore;
          submission.maxScore = totalMaxScore;
          submission.results = allResults;
          await submission.save();

          studentResult.score = totalScore;
          studentResult.maxScore = totalMaxScore;
          studentResult.percentage = Math.round((totalScore / totalMaxScore) * 100);
          studentResult.status = studentResult.percentage === 100 ? 'passed' : 'failed';
          results.push(studentResult);
          continue;
        }

        // Function assignments
        if (assignment) {
          let fileNotFound = true;

          for (const file of assignment.files) {
            const filePath = `${assignment.path}/${file.filename}`;
            const code = await fetchGitHubFile(student.githubUsername, specs.course.repoName, filePath);

            if (!code) {
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

            fileNotFound = false;
            const result: GradeResult = gradeAssignment(code, file.functions);
            totalScore += result.score;
            totalMaxScore += result.maxScore;
            allResults.push(...result.results);
          }

          // If no files found at all, mark as not submitted
          if (fileNotFound && totalMaxScore > 0) {
            submission.status = 'error';
            submission.errorMessage = 'Assignment files not found - not submitted';
            submission.score = 0;
            submission.maxScore = totalMaxScore;
            submission.results = allResults;
            await submission.save();

            studentResult.status = 'not-submitted';
            studentResult.maxScore = totalMaxScore;
            studentResult.errorMessage = 'Assignment not submitted';
            results.push(studentResult);
            continue;
          }

          submission.status = 'completed';
          submission.score = totalScore;
          submission.maxScore = totalMaxScore;
          submission.results = allResults;
          await submission.save();

          studentResult.score = totalScore;
          studentResult.maxScore = totalMaxScore;
          studentResult.percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
          studentResult.status = studentResult.percentage === 100 ? 'passed' : 'failed';
          results.push(studentResult);
        }

      } catch (error: any) {
        studentResult.status = 'error';
        studentResult.errorMessage = error.message;
        results.push(studentResult);
      }
    }

    // Summary stats
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const notSubmitted = results.filter(r => r.status === 'not-submitted').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      message: 'Batch grading complete',
      summary: {
        total: results.length,
        passed,
        failed,
        notSubmitted,
        errors
      },
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Batch grading failed' },
      { status: 500 }
    );
  }
}
