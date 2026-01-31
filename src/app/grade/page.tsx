'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Student {
  _id: string;
  name: string;
  githubUsername: string;
}

interface Assignment {
  week: number;
  session: number;
  title: string;
  functions?: { name: string }[];
  endpoints?: { method: string; path: string }[];
}

interface TestResult {
  functionName: string;
  testIndex: number;
  input: any[];
  expected: any;
  actual?: any;
  passed: boolean;
  error?: string;
}

interface GradeResult {
  status: 'passed' | 'failed' | 'error';
  score: number;
  maxScore: number;
  percentage: number;
  results: TestResult[];
  message?: string;
  error?: string;
}

interface PreviewCheck {
  label: string;
  path: string;
  exists: boolean;
}

interface PreviewInfo {
  owner: string;
  repoName: string;
  repoExists: boolean;
  durationMs: number;
  checks: PreviewCheck[];
}

function GradePageContent() {
  const searchParams = useSearchParams();
  const preselectedStudent = searchParams.get('student');

  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState('');

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [preview, setPreview] = useState<PreviewInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const [studentsRes, assignmentsRes] = await Promise.all([
          fetch('/api/students'),
          fetch('/api/assignments')
        ]);

        const [studentsJson, assignmentsJson] = await Promise.all([
          studentsRes.json(),
          assignmentsRes.json()
        ]);

        if (!studentsRes.ok) {
          throw new Error(studentsJson?.error || 'Failed to load students');
        }
        if (!assignmentsRes.ok) {
          throw new Error(assignmentsJson?.error || 'Failed to load assignments');
        }

        const studentsList: Student[] = Array.isArray(studentsJson)
          ? studentsJson
          : Array.isArray(studentsJson?.students)
            ? studentsJson.students
            : [];

        const assignmentsList: Assignment[] = Array.isArray(assignmentsJson)
          ? assignmentsJson
          : Array.isArray(assignmentsJson?.assignments)
            ? assignmentsJson.assignments
            : [];

        setStudents(studentsList);
        setAssignments(assignmentsList);

        if (preselectedStudent) {
          setSelectedStudent(preselectedStudent);
        }
      } catch (e: any) {
        setStudents([]);
        setAssignments([]);
        setError(e?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [preselectedStudent]);

  useEffect(() => {
    if (!selectedStudent || !selectedAssignment) {
      setPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return;
    }

    const [week, session] = selectedAssignment.split('-').map(Number);
    if (!week || !session) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const run = async () => {
      setPreviewLoading(true);
      setPreviewError('');

      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            studentId: selectedStudent,
            week,
            session
          })
        });

        const data = await res.json();

        if (!res.ok) {
          setPreview(null);
          setPreviewError(data?.error || 'Preview check failed');
          return;
        }

        setPreview(data?.preview || null);
      } catch (e: any) {
        setPreview(null);
        if (e?.name === 'AbortError') {
          setPreviewError('Preview timed out (GitHub is slow). Try again.');
        } else {
          setPreviewError('Preview failed to load');
        }
      } finally {
        clearTimeout(timeout);
        setPreviewLoading(false);
      }
    };

    void run();

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedStudent, selectedAssignment]);

  const handleGrade = async () => {
    if (!selectedStudent || !selectedAssignment) {
      setError('Please select a student and assignment');
      return;
    }

    setGrading(true);
    setError('');
    setResult(null);

    const [week, session] = selectedAssignment.split('-').map(Number);

    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          week,
          session
        })
      });

      const data = await res.json();
      // Even for non-2xx errors, the API may return a submission with details.
      if (res.ok || data?.submission) {
        const submission = data.submission || data;
        const maxScore = submission.maxScore ?? 0;
        const score = submission.score ?? 0;
        const percentage = submission.percentage ?? (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);
        const status: GradeResult['status'] =
          submission.errorMessage || data.error
            ? 'error'
            : percentage === 100
            ? 'passed'
            : 'failed';

        setResult({
          status,
          score,
          maxScore,
          percentage,
          results: submission.results || [],
          message: data.message,
          error: data.error
        });
      } else {
        setError(data?.error || 'Grading failed');
      }
    } catch (err) {
      setError('Failed to grade assignment');
    } finally {
      setGrading(false);
    }
  };

  const selectedStudentData = students.find(s => s._id === selectedStudent);
  const selectedAssignmentData = assignments.find(
    a => `${a.week}-${a.session}` === selectedAssignment
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Grade Assignment</h1>
        <p className="mt-1 text-gray-600">
          Select a student and assignment to automatically grade their submission
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Selection Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a student...</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} (@{student.githubUsername})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment
            </label>
            <select
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select an assignment...</option>
              {assignments.map((assignment) => (
                <option
                  key={`${assignment.week}-${assignment.session}`}
                  value={`${assignment.week}-${assignment.session}`}
                >
                  Week {assignment.week} Session {assignment.session}: {assignment.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview */}
        {selectedStudentData && selectedAssignmentData && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-900 mb-2">Submission Preview</h3>
            <p className="text-sm text-gray-600">
              Will fetch code from:{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                github.com/{selectedStudentData.githubUsername}/backend-js-course/
                {selectedAssignmentData.week === 1 && selectedAssignmentData.session === 1
                  ? 'README.md'
                  : `week-${String(selectedAssignmentData.week).padStart(2, '0')}/session-${String(selectedAssignmentData.session).padStart(2, '0')}/`
                }
              </code>
            </p>

            <div className="mt-3 text-sm">
              {previewLoading ? (
                <p className="text-gray-600">Checking GitHub…</p>
              ) : previewError ? (
                <p className="text-red-700">{previewError}</p>
              ) : preview ? (
                <div className="space-y-1">
                  <p className="text-gray-600">
                    Preview check took <span className="font-medium">{preview.durationMs}ms</span>
                  </p>
                  {preview.checks.length > 0 && (
                    <ul className="list-disc pl-5 text-gray-700">
                      {preview.checks.map((c) => (
                        <li key={`${c.label}:${c.path}`}>
                          {c.label}: <span className="font-mono text-xs">{c.path}</span>{' '}
                          <span className={c.exists ? 'text-green-700' : 'text-red-700'}>
                            ({c.exists ? 'found' : 'missing'})
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            {selectedAssignmentData.functions && (
              <p className="text-sm text-gray-600 mt-2">
                Testing functions:{' '}
                {selectedAssignmentData.functions.map(f => f.name).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleGrade}
            disabled={grading || !selectedStudent || !selectedAssignment}
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {grading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Grading...
              </span>
            ) : (
              '🚀 Grade Assignment'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className={`p-6 ${
            result.status === 'passed'
              ? 'bg-green-50'
              : result.status === 'failed'
              ? 'bg-yellow-50'
              : 'bg-red-50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {result.status === 'passed' && '✅ All Tests Passed!'}
                  {result.status === 'failed' && '⚠️ Some Tests Failed'}
                  {result.status === 'error' && '❌ Error Running Tests'}
                </h2>
                {result.message && (
                  <p className="text-gray-600 mt-1">{result.message}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{result.percentage}%</p>
                <p className="text-sm text-gray-500">Score</p>
              </div>
            </div>
          </div>

          {/* Test Details */}
          <div className="p-6">
            <h3 className="font-medium text-gray-900 mb-4">Test Results</h3>
            <div className="space-y-3">
              {(result.results ?? []).map((test, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md border ${
                    test.passed
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {test.passed ? '✓' : '✗'} {test.functionName} #{test.testIndex + 1}
                      </p>
                      <div className="mt-2 text-sm space-y-1">
                        <p>
                          <span className="text-gray-500">Input:</span>{' '}
                          <code className="bg-gray-200 px-1 rounded">
                            {JSON.stringify(test.input)}
                          </code>
                        </p>
                        <p>
                          <span className="text-gray-500">Expected:</span>{' '}
                          <code className="bg-gray-200 px-1 rounded">
                            {JSON.stringify(test.expected)}
                          </code>
                        </p>
                        {!test.passed && (
                          <p>
                            <span className="text-gray-500">Actual:</span>{' '}
                            <code className="bg-red-200 px-1 rounded">
                              {test.error || JSON.stringify(test.actual)}
                            </code>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      test.passed
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {test.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">📝 How Grading Works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>The grader fetches the student&apos;s code from their GitHub repository</li>
          <li>Code is executed in a secure sandbox environment</li>
          <li>Each function is tested against predefined test cases</li>
          <li>Results are recorded and the student&apos;s score is calculated</li>
          <li>Previous submissions are stored for progress tracking</li>
        </ol>
        <p className="mt-4 text-sm text-blue-700">
          <strong>Note:</strong> Students must push their code to the correct path:{' '}
          <code className="bg-blue-100 px-1 rounded">
            backend-js-course/week-XX/session-YY/filename.js
          </code>
        </p>
      </div>
    </div>
  );
}

export default function GradePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <GradePageContent />
    </Suspense>
  );
}
