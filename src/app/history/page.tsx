'use client';

import { useState, useEffect } from 'react';

interface Submission {
  _id: string;
  studentId: {
    _id: string;
    name: string;
    githubUsername: string;
  };
  week: number;
  session: number;
  status: 'passed' | 'failed' | 'error';
  score: number;
  maxScore: number;
  percentage: number;
  gradedAt: string;
}

export default function HistoryPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    week: '',
    status: ''
  });

  useEffect(() => {
    fetchSubmissions();
  }, [filters]);

  const fetchSubmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.week) params.set('week', filters.week);
      if (filters.status) params.set('status', filters.status);
      
      const res = await fetch(`/api/grade?${params}`);
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const totalSubmissions = submissions.length;
  const passedCount = submissions.filter(s => s.status === 'passed').length;
  const avgScore = submissions.length > 0
    ? Math.round(submissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.length)
    : 0;

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
        <h1 className="text-3xl font-bold text-gray-900">Submission History</h1>
        <p className="mt-1 text-gray-600">
          View all graded submissions and track student progress
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-4xl font-bold text-indigo-600">{totalSubmissions}</p>
          <p className="text-sm text-gray-500">Total Submissions</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-4xl font-bold text-green-600">{passedCount}</p>
          <p className="text-sm text-gray-500">Passed</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-4xl font-bold text-blue-600">{avgScore}%</p>
          <p className="text-sm text-gray-500">Average Score</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Week
            </label>
            <select
              value={filters.week}
              onChange={(e) => setFilters({ ...filters, week: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Weeks</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Graded
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No submissions found. Grade some assignments to see history here.
                </td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <tr key={submission._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {submission.studentId.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{submission.studentId.githubUsername}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      Week {submission.week}, Session {submission.session}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      submission.status === 'passed'
                        ? 'bg-green-100 text-green-800'
                        : submission.status === 'failed'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {submission.status === 'passed' && '✓ Passed'}
                      {submission.status === 'failed' && '⚠ Failed'}
                      {submission.status === 'error' && '✗ Error'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                              (submission.percentage || 0) >= 80 ? 'bg-green-500' :
                              (submission.percentage || 0) >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                            style={{ width: `${submission.percentage || 0}%` }}
                        ></div>
                      </div>
                        <span className="text-sm text-gray-900">{submission.percentage || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(submission.gradedAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
