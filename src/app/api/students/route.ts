import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student, Submission } from '@/lib/models';

// GET /api/students - List all students
export async function GET() {
  try {
    await connectDB();
    const students = await Student.find().sort({ name: 1 }).lean();

    const submissionStats = await Submission.aggregate([
      {
        $group: {
          _id: '$studentId',
          totalSubmissions: { $sum: 1 },
          completedAssignments: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          completedScore: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$score', 0]
            }
          },
          completedMaxScore: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$maxScore', 0]
            }
          }
        }
      }
    ]);

    const byStudentId = new Map(
      submissionStats.map((s: any) => [String(s._id), s])
    );

    const withStats = students.map((student: any) => {
      const stats = byStudentId.get(String(student._id));
      const totalMaxScore = Number(stats?.completedMaxScore || 0);
      const totalScore = Number(stats?.completedScore || 0);
      const averageScore = totalMaxScore > 0
        ? Math.round((totalScore / totalMaxScore) * 100)
        : 0;

      return {
        ...student,
        stats: {
          totalSubmissions: Number(stats?.totalSubmissions || 0),
          completedAssignments: Number(stats?.completedAssignments || 0),
          averageScore
        }
      };
    });

    return NextResponse.json(withStats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const { name, email, githubUsername } = body;

    if (!name || !email || !githubUsername) {
      return NextResponse.json(
        { error: 'Name, email, and GitHub username are required' },
        { status: 400 }
      );
    }

    // Check for existing student
    const existing = await Student.findOne({
      $or: [{ email }, { githubUsername }]
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Student with this email or GitHub username already exists' },
        { status: 409 }
      );
    }

    const student = await Student.create({
      name,
      email,
      githubUsername
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create student' },
      { status: 500 }
    );
  }
}
