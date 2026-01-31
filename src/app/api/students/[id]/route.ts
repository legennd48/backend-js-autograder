import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student, Submission } from '@/lib/models';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/students/[id] - Get student by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    
    const student = await Student.findById(id);
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get submission stats
    const submissions = await Submission.find({ studentId: id });
    const stats = {
      totalSubmissions: submissions.length,
      completedAssignments: submissions.filter(s => s.status === 'completed').length,
      totalScore: submissions.reduce((sum, s) => sum + s.score, 0),
      totalMaxScore: submissions.reduce((sum, s) => sum + s.maxScore, 0)
    };

    return NextResponse.json({
      student,
      stats,
      submissions
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

// PATCH /api/students/[id] - Update student
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const updates: Record<string, any> = {};
    const allowedFields = ['name', 'email', 'githubUsername', 'isActive'];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    const student = await Student.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update student' },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id] - Delete student
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const student = await Student.findByIdAndDelete(id);

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Also delete their submissions
    await Submission.deleteMany({ studentId: id });

    return NextResponse.json({ message: 'Student deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}
