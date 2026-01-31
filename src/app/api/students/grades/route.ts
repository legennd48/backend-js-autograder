import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student, Submission } from '@/lib/models';
import { listAssignments } from '@/lib/specs';

// GET /api/students/grades - Get all students with their grades for all assignments
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get all students
    const students = await Student.find({ isActive: true })
      .sort({ name: 1 })
      .lean();

    // Get all assignments
    const assignments = listAssignments();

    // Get all submissions
    const submissions = await Submission.find({})
      .lean();

    // Create a lookup map for submissions
    const submissionMap = new Map<string, any>();
    for (const sub of submissions) {
      const key = `${sub.studentId}-${sub.week}-${sub.session}`;
      submissionMap.set(key, sub);
    }

    // Build the grades matrix
    const studentsWithGrades = students.map((student: any) => {
      const grades: Record<string, {
        status: 'passed' | 'failed' | 'error' | 'not-graded';
        score: number;
        maxScore: number;
        percentage: number;
      }> = {};

      let totalScore = 0;
      let totalMaxScore = 0;
      let completedCount = 0;

      for (const assignment of assignments) {
        const key = `${student._id}-${assignment.week}-${assignment.session}`;
        const submission = submissionMap.get(key);

        const assignmentKey = `${assignment.week}-${assignment.session}`;

        if (submission) {
          const score = Number(submission.score || 0);
          const maxScore = Number(submission.maxScore || 0);
          const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

          let status: 'passed' | 'failed' | 'error' = 'failed';
          if (submission.status === 'error') status = 'error';
          else if (submission.status === 'completed') {
            status = percentage === 100 ? 'passed' : 'failed';
          }

          grades[assignmentKey] = { status, score, maxScore, percentage };
          totalScore += score;
          totalMaxScore += maxScore;
          completedCount++;
        } else {
          grades[assignmentKey] = { status: 'not-graded', score: 0, maxScore: 0, percentage: 0 };
        }
      }

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        githubUsername: student.githubUsername,
        grades,
        summary: {
          completedAssignments: completedCount,
          totalAssignments: assignments.length,
          totalScore,
          totalMaxScore,
          overallPercentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0
        }
      };
    });

    return NextResponse.json({
      assignments: assignments.map(a => ({
        week: a.week,
        session: a.session,
        title: a.title,
        type: a.type,
        key: `${a.week}-${a.session}`
      })),
      students: studentsWithGrades
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch student grades' },
      { status: 500 }
    );
  }
}
