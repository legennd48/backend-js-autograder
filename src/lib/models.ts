import mongoose, { Schema, Document } from 'mongoose';

// Student document interface
export interface IStudent extends Document {
  name: string;
  email: string;
  githubUsername: string;
  enrolledAt: Date;
  isActive: boolean;
}

// Submission document interface  
export interface ISubmission extends Document {
  studentId: mongoose.Types.ObjectId;
  week: number;
  session: number;
  submittedAt: Date;
  status: 'pending' | 'grading' | 'completed' | 'error';
  score: number;
  maxScore: number;
  results: ITestResult[];
  errorMessage?: string;
}

export interface ITestResult {
  functionName: string;
  testIndex: number;
  passed: boolean;
  input: any[];
  expected: any;
  actual?: any;
  error?: string;
}

// Student Schema
const studentSchema = new Schema<IStudent>({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  githubUsername: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  },
  enrolledAt: { 
    type: Date, 
    default: Date.now 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Submission Schema
const testResultSchema = new Schema<ITestResult>({
  functionName: String,
  testIndex: Number,
  passed: Boolean,
  input: Schema.Types.Mixed,
  expected: Schema.Types.Mixed,
  actual: Schema.Types.Mixed,
  error: String
}, { _id: false });

const submissionSchema = new Schema<ISubmission>({
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Student',
    required: true,
    index: true
  },
  week: { 
    type: Number, 
    required: true,
    min: 1,
    max: 12
  },
  session: { 
    type: Number, 
    required: true,
    min: 1,
    max: 24
  },
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ['pending', 'grading', 'completed', 'error'],
    default: 'pending'
  },
  score: { 
    type: Number, 
    default: 0 
  },
  maxScore: { 
    type: Number, 
    default: 0 
  },
  results: [testResultSchema],
  errorMessage: String
}, { 
  timestamps: true 
});

// Indexes for efficient queries
submissionSchema.index({ studentId: 1, week: 1, session: 1 });
submissionSchema.index({ submittedAt: -1 });

// Models - handle hot reloading in development
export const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', studentSchema);
export const Submission = mongoose.models.Submission || mongoose.model<ISubmission>('Submission', submissionSchema);
