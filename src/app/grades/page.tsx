'use client';

import { useState, useEffect } from 'react';

interface Assignment {
  week: number;
  session: number;
  title: string;
  type: string;
  key: string;
}

interface Grade {
  status: 'passed' | 'failed' | 'error' | 'not-graded';
  score: number;
  maxScore: number;
  percentage: number;
}

interface StudentWithGrades {
  _id: string;
  name: string;
  email: string;
  githubUsername: string;
  grades: Record<string, Grade>;
  summary: {
    completedAssignments: number;
    totalAssignments: number;
    totalScore: number;
    totalMaxScore: number;
    overallPercentage: number;
  };
}

interface GradesData {
  assignments: Assignment[];
  students: StudentWithGrades[];
}

export default function GradesPage() {
  const [data, setData] = useState<GradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/students/grades');
      const result = await res.json();
      if (res.ok) {
        setData(result);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        No data available
      </div>
    );
  }

  // Get unique weeks
  const weeks = [...new Set(data.assignments.map(a => a.week))].sort((a, b) => a - b);
  
  // Filter assignments by week
  const filteredAssignments = selectedWeek === 'all'
    ? data.assignments
    : data.assignments.filter(a => a.week === parseInt(selectedWeek));

  // Calculate class statistics
  const classStats = {
    avgPercentage: data.students.length > 0
      ? Math.round(data.students.reduce((sum, s) => sum + s.summary.overallPercentage, 0) / data.students.length)
      : 0,
    passRate: data.students.length > 0
      ? Math.round((data.students.filter(s => s.summary.overallPercentage >= 80).length / data.students.length) * 100)
      : 0
  };

  const getStatusIcon = (grade: Grade | undefined) => {
    if (!grade || grade.status === 'not-graded') {
      return <span className="text-gray-300">—</span>;
    }
    if (grade.status === 'passed') {
      return <span className="text-green-600 font-bold">✓</span>;
    }
    if (grade.status === 'failed') {
      return <span className="text-yellow-600">{grade.percentage}%</span>;
    }
    if (grade.status === 'error') {
      return <span className="text-red-500">✗</span>;
    }
    return null;
  };

  const getStatusBg = (grade: Grade | undefined) => {
    if (!grade || grade.status === 'not-graded') return 'bg-gray-50';
    if (grade.status === 'passed') return 'bg-green-50';
    if (grade.status === 'failed') return 'bg-yellow-50';
    if (grade.status === 'error') return 'bg-red-50';
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grade Book</h1>
          <p className="mt-1 text-gray-600">
            Overview of all student grades across assignments
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Weeks</option>
            {weeks.map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
          <button
            onClick={fetchGrades}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Class Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-indigo-600">{data.students.length}</p>
          <p className="text-sm text-gray-500">Students</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data.assignments.length}</p>
          <p className="text-sm text-gray-500">Assignments</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{classStats.avgPercentage}%</p>
          <p className="text-sm text-gray-500">Class Average</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{classStats.passRate}%</p>
          <p className="text-sm text-gray-500">Pass Rate (≥80%)</p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-green-50 border border-green-200 rounded"></span>
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-gray-600">Passed (100%)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></span>
            <span className="text-gray-600">Partial score</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-red-50 border border-red-200 rounded"></span>
            <span className="text-red-500">✗</span>
            <span className="text-gray-600">Error / Not submitted</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-gray-50 border border-gray-200 rounded"></span>
            <span className="text-gray-300">—</span>
            <span className="text-gray-600">Not graded yet</span>
          </span>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                  Student
                </th>
                {filteredAssignments.map(assignment => (
                  <th
                    key={assignment.key}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px]"
                    title={`Week ${assignment.week} Session ${assignment.session}: ${assignment.title}`}
                  >
                    <div className="whitespace-nowrap">W{assignment.week}</div>
                    <div className="text-gray-400">S{assignment.session}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px] bg-gray-100">
                  Overall
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.students.length === 0 ? (
                <tr>
                  <td colSpan={filteredAssignments.length + 2} className="px-6 py-12 text-center text-gray-500">
                    No students enrolled yet.
                  </td>
                </tr>
              ) : (
                data.students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500">@{student.githubUsername}</div>
                        </div>
                      </div>
                    </td>
                    {filteredAssignments.map(assignment => {
                      const grade = student.grades[assignment.key];
                      return (
                        <td
                          key={assignment.key}
                          className={`px-2 py-3 text-center text-sm ${getStatusBg(grade)}`}
                          title={grade && grade.status !== 'not-graded' 
                            ? `${grade.score}/${grade.maxScore} (${grade.percentage}%)`
                            : 'Not graded'
                          }
                        >
                          {getStatusIcon(grade)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center bg-gray-50">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.summary.overallPercentage >= 80
                          ? 'bg-green-100 text-green-800'
                          : student.summary.overallPercentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : student.summary.overallPercentage > 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {student.summary.completedAssignments > 0 
                          ? `${student.summary.overallPercentage}%`
                          : '—'
                        }
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {student.summary.completedAssignments}/{student.summary.totalAssignments}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Student Breakdown (Collapsible) */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Student Details</h2>
          <p className="text-sm text-gray-600">Click on a student to see their full grade breakdown</p>
        </div>
        <div className="divide-y divide-gray-200">
          {data.students.map((student) => (
            <details key={student._id} className="group">
              <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-900">{student.name}</span>
                  <span className="text-sm text-gray-500">@{student.githubUsername}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    student.summary.overallPercentage >= 80
                      ? 'bg-green-100 text-green-800'
                      : student.summary.overallPercentage >= 60
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {student.summary.overallPercentage}%
                  </span>
                  <span className="text-sm text-gray-500">
                    {student.summary.completedAssignments}/{student.summary.totalAssignments} completed
                  </span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </summary>
              <div className="px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {data.assignments.map(assignment => {
                    const grade = student.grades[assignment.key];
                    return (
                      <div
                        key={assignment.key}
                        className={`p-2 rounded text-center ${getStatusBg(grade)} border`}
                      >
                        <div className="text-xs text-gray-500">W{assignment.week} S{assignment.session}</div>
                        <div className="font-medium">
                          {grade && grade.status !== 'not-graded' 
                            ? `${grade.percentage}%`
                            : '—'
                          }
                        </div>
                        <div className="text-xs text-gray-400">
                          {grade && grade.status !== 'not-graded' 
                            ? `${grade.score}/${grade.maxScore}`
                            : 'Not graded'
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
