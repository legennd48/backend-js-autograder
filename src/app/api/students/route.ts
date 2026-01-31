import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Student } from '@/lib/models';

// GET /api/students - List all students
export async function GET() {
  try {
    await connectDB();
    const students = await Student.find().sort({ name: 1 });
    return NextResponse.json(students);
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
