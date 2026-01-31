import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Backend JS Auto-Grader',
  description: 'Automatic grading system for Backend JavaScript course assignments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center space-x-8">
                <a href="/" className="text-xl font-bold text-blue-600">
                  🎓 Backend JS Grader
                </a>
                <div className="hidden md:flex space-x-4">
                  <a href="/" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Dashboard
                  </a>
                  <a href="/students" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Students
                  </a>
                  <a href="/assignments" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Assignments
                  </a>
                  <a href="/grade" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    Grade
                  </a>
                  <a href="/history" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                    History
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
