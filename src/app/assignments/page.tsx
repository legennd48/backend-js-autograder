'use client';

import { useState, useEffect } from 'react';

interface FunctionSpec {
  name: string;
  description: string;
  params: { name: string; type: string; description: string }[];
  returns: { type: string; description: string };
  testCases: { input: any[]; expected: any; description: string }[];
}

interface Assignment {
  week: number;
  session: number;
  title: string;
  description: string;
  file: string;
  functions?: FunctionSpec[];
  endpoints?: {
    method: string;
    path: string;
    description: string;
    testCases: any[];
  }[];
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch('/api/assignments');
      const data = await res.json();
      if (res.ok) {
        setAssignments(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = async (week: number, session: number) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/assignments/${week}-${session}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedAssignment(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch assignment details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Group assignments by week
  const groupedByWeek = assignments.reduce((acc, assignment) => {
    const week = assignment.week;
    if (!acc[week]) acc[week] = [];
    acc[week].push(assignment);
    return acc;
  }, {} as Record<number, Assignment[]>);

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
        <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
        <p className="mt-1 text-gray-600">
          Browse all course assignments and their test specifications
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment List */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(groupedByWeek)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, weekAssignments]) => (
              <div key={week} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-indigo-600 px-4 py-2">
                  <h2 className="text-white font-semibold">Week {week}</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {weekAssignments
                    .sort((a, b) => a.session - b.session)
                    .map((assignment) => (
                      <div
                        key={`${assignment.week}-${assignment.session}`}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                          selectedAssignment?.week === assignment.week &&
                          selectedAssignment?.session === assignment.session
                            ? 'bg-indigo-50 border-l-4 border-indigo-600'
                            : ''
                        }`}
                        onClick={() => viewDetails(assignment.week, assignment.session)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              Session {assignment.session}
                            </span>
                            <span className="font-medium text-gray-900">
                              {assignment.title}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {assignment.functions && (
                              <span className="text-xs text-gray-500">
                                {assignment.functions.length} function(s)
                              </span>
                            )}
                            {assignment.endpoints && (
                              <span className="text-xs text-gray-500">
                                {assignment.endpoints.length} endpoint(s)
                              </span>
                            )}
                            <svg
                              className="h-5 w-5 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </div>

        {/* Assignment Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow sticky top-4">
            {loadingDetails ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : selectedAssignment ? (
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs text-indigo-600 font-semibold uppercase">
                    Week {selectedAssignment.week} · Session {selectedAssignment.session}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">
                    {selectedAssignment.title}
                  </h3>
                  <p className="text-gray-600 text-sm mt-2">
                    {selectedAssignment.description}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Expected file:</p>
                  <code className="block bg-gray-100 px-3 py-2 rounded text-sm break-all">
                    {selectedAssignment.file}
                  </code>
                </div>

                {selectedAssignment.functions && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-gray-900">Functions to Implement</h4>
                    {selectedAssignment.functions.map((func) => (
                      <div key={func.name} className="bg-gray-50 rounded-md p-4">
                        <code className="text-indigo-600 font-semibold">
                          {func.name}({func.params.map(p => p.name).join(', ')})
                        </code>
                        <p className="text-sm text-gray-600 mt-1">{func.description}</p>
                        
                        {func.params.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 uppercase">Parameters</p>
                            <ul className="mt-1 space-y-1">
                              {func.params.map((param) => (
                                <li key={param.name} className="text-sm">
                                  <code className="text-gray-800">{param.name}</code>
                                  <span className="text-gray-400"> : {param.type}</span>
                                  <span className="text-gray-500"> — {param.description}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 uppercase">Returns</p>
                          <p className="text-sm">
                            <span className="text-gray-400">{func.returns.type}</span>
                            <span className="text-gray-500"> — {func.returns.description}</span>
                          </p>
                        </div>

                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Test Cases ({func.testCases.length})
                          </p>
                          <ul className="mt-1 space-y-1 text-sm">
                            {func.testCases.slice(0, 3).map((tc, i) => (
                              <li key={i} className="flex items-center">
                                <span className="text-gray-400 mr-2">→</span>
                                <code className="text-xs bg-gray-200 px-1 rounded">
                                  {func.name}({tc.input.map((v: any) => JSON.stringify(v)).join(', ')})
                                </code>
                                <span className="text-gray-400 mx-1">=</span>
                                <code className="text-xs bg-green-100 px-1 rounded">
                                  {JSON.stringify(tc.expected)}
                                </code>
                              </li>
                            ))}
                            {func.testCases.length > 3 && (
                              <li className="text-gray-400 text-xs">
                                + {func.testCases.length - 3} more test cases
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedAssignment.endpoints && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-gray-900">API Endpoints</h4>
                    {selectedAssignment.endpoints.map((endpoint, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-md p-4">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm">{endpoint.path}</code>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {endpoint.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <a
                    href={`/grade?assignment=${selectedAssignment.week}-${selectedAssignment.session}`}
                    className="w-full inline-flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Grade This Assignment
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2">Select an assignment to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-medium text-amber-900 mb-2">📋 Student Submission Guidelines</h3>
        <div className="text-sm text-amber-800 space-y-2">
          <p>Students must follow this structure in their repository:</p>
          <pre className="bg-amber-100 p-3 rounded overflow-x-auto">
{`backend-js-course/
├── week-02/
│   ├── session-03/
│   │   └── functions.js
│   └── session-04/
│       └── conditionals.js
├── week-03/
│   ├── session-05/
│   │   └── loops.js
...`}
          </pre>
          <p className="mt-2">
            <strong>Important:</strong> Functions must be exported using{' '}
            <code className="bg-amber-100 px-1 rounded">module.exports = {'{ functionName }'}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
