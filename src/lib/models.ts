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
  lastEmailSignature?: string;
  lastEmailedAt?: Date;
  lastEmailError?: string;
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

export interface IEmailOutbox extends Document {
  type: 'grade-report';
  status: 'pending' | 'processing' | 'sent' | 'canceled';
  attempts: number;
  nextAttemptAt: Date;
  processingStartedAt?: Date;
  sentAt?: Date;
  lastError?: string;
  cancelReason?: string;
  studentId: mongoose.Types.ObjectId;
  submissionId: mongoose.Types.ObjectId;
  to: string;
  signature: string;
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
  errorMessage: String,
  lastEmailSignature: { type: String, default: null },
  lastEmailedAt: { type: Date, default: null },
  lastEmailError: { type: String, default: null }
}, { 
  timestamps: true 
});

// Email Outbox Schema (async email queue)
const emailOutboxSchema = new Schema<IEmailOutbox>(
  {
    type: {
      type: String,
      enum: ['grade-report'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'canceled'],
      default: 'pending',
      index: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    processingStartedAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    cancelReason: { type: String, default: null },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true
    },
    to: {
      type: String,
      required: true,
      trim: true
    },
    signature: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

emailOutboxSchema.index({ submissionId: 1, signature: 1 }, { unique: true });
emailOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });

// Indexes for efficient queries
submissionSchema.index({ studentId: 1, week: 1, session: 1 });
submissionSchema.index({ submittedAt: -1 });

// Models - handle hot reloading in development
export const Student = mongoose.models.Student || mongoose.model<IStudent>('Student', studentSchema);
export const Submission = mongoose.models.Submission || mongoose.model<ISubmission>('Submission', submissionSchema);
export const EmailOutbox =
  mongoose.models.EmailOutbox || mongoose.model<IEmailOutbox>('EmailOutbox', emailOutboxSchema);
