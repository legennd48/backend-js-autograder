'use client';

import { useState, useEffect } from 'react';

interface Student {
  _id: string;
  name: string;
  email: string;
  githubUsername: string;
  createdAt: string;
  stats?: {
    totalSubmissions: number;
    averageScore: number;
    completedAssignments: number;
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    githubUsername: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      if (res.ok) {
        setStudents(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok) {
        setStudents([...students, data]);
        setFormData({ name: '', email: '', githubUsername: '' });
        setShowForm(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStudents(students.filter(s => s._id !== id));
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to delete student');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-gray-600">
            Manage enrolled students and their GitHub accounts
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Add Student Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Student</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.githubUsername}
                  onChange={(e) => setFormData({ ...formData, githubUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="johndoe"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GitHub
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submissions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No students enrolled yet. Click &quot;Add Student&quot; to get started.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {student.name}
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href={`https://github.com/${student.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      @{student.githubUsername}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.stats?.totalSubmissions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      (student.stats?.averageScore || 0) >= 80
                        ? 'bg-green-100 text-green-800'
                        : (student.stats?.averageScore || 0) >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.stats?.averageScore?.toFixed(0) || 0}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/grade?student=${student._id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Grade
                    </a>
                    <button
                      onClick={() => handleDelete(student._id, student.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Stats */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Class Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{students.length}</p>
              <p className="text-sm text-gray-500">Total Students</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {students.reduce((sum, s) => sum + (s.stats?.totalSubmissions || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Total Submissions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {students.length > 0
                  ? (students.reduce((sum, s) => sum + (s.stats?.averageScore || 0), 0) / students.length).toFixed(0)
                  : 0}%
              </p>
              <p className="text-sm text-gray-500">Class Average</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">
                {students.filter(s => (s.stats?.averageScore || 0) >= 80).length}
              </p>
              <p className="text-sm text-gray-500">High Performers</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
