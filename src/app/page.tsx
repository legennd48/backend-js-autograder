import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Backend JavaScript Auto-Grader
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Automatically grade student assignments from their GitHub repositories.
          Track progress across all 12 weeks of the course.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Link href="/students" className="card hover:shadow-lg transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Manage Students
            </h2>
            <p className="text-gray-600">
              Add, edit, or remove students. View their GitHub usernames and enrollment status.
            </p>
          </div>
        </Link>

        <Link href="/grade" className="card hover:shadow-lg transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Grade Submissions
            </h2>
            <p className="text-gray-600">
              Select a student and assignment to automatically fetch and grade their code.
            </p>
          </div>
        </Link>

        <Link href="/assignments" className="card hover:shadow-lg transition-shadow">
          <div className="text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              View Assignments
            </h2>
            <p className="text-gray-600">
              Browse all 24 sessions with their test specifications and requirements.
            </p>
          </div>
        </Link>
      </div>

      {/* Course Overview */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Course Overview</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { week: '1-2', title: 'JS Fundamentals', icon: '📝' },
            { week: '3-4', title: 'Data Structures', icon: '📊' },
            { week: '5-6', title: 'Modules & HTTP', icon: '🌐' },
            { week: '7-8', title: 'Express & MongoDB', icon: '🗄️' },
            { week: '9-10', title: 'Auth & Security', icon: '🔐' },
            { week: '11-12', title: 'Testing & Deploy', icon: '🚀' },
          ].map((phase) => (
            <div key={phase.week} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl mb-2">{phase.icon}</div>
              <div className="font-medium text-gray-900">Week {phase.week}</div>
              <div className="text-sm text-gray-600">{phase.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Fetch Code</h3>
            <p className="text-gray-600 text-sm">
              Student code is fetched from their GitHub repository using the expected file structure.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Run Tests</h3>
            <p className="text-gray-600 text-sm">
              Code is executed in a secure sandbox with predefined test cases for each function.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Record Results</h3>
            <p className="text-gray-600 text-sm">
              Results are stored in the database for tracking progress and generating reports.
            </p>
          </div>
        </div>
      </div>

      {/* Repository Structure */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Expected Repository Structure</h2>
        <p className="text-gray-600 mb-4">
          Students must create a repository named <code className="bg-gray-100 px-2 py-1 rounded">backend-js-course</code> with this structure:
        </p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`backend-js-course/
├── week-02/
│   ├── session-03/
│   │   └── functions.js
│   └── session-04/
│       └── control-flow.js
├── week-03/
│   ├── session-05/
│   │   └── loops.js
│   └── session-06/
│       └── arrays.js
├── week-04/
│   ├── session-07/
│   │   └── objects.js
│   └── session-08/
│       └── array-methods.js
└── ... (continues for all weeks)`}
        </pre>
      </div>
    </div>
  );
}
