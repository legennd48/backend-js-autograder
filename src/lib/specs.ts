// Assignment specifications imported from JSON
import specsData from '../../assignment-specs.json';

export interface FunctionSpec {
  name: string;
  description: string;
  params: Array<{ name: string; type: string }>;
  returns: string;
  tests: Array<{
    input: any[];
    expected?: any;
    throws?: string;
    tolerance?: number;
    deepEqual?: boolean;
    matchesShape?: Record<string, string>;
  }>;
  skipAutoTest?: boolean;
}

export interface FileSpec {
  filename: string;
  functions: FunctionSpec[];
}

export interface AssignmentSpec {
  week: number;
  session: number;
  title: string;
  path: string;
  files: FileSpec[];
}

export interface EndpointSpec {
  method: string;
  path: string;
  description: string;
  body?: Record<string, string>;
  queryParams?: string[];
  requiresAuth?: boolean;
  requiresRole?: string;
  requiresOwnership?: boolean;
  response: {
    status: number;
    type?: string;
    contains?: string[];
  };
  errorResponses?: Array<{
    status: number;
    condition: string;
  }>;
}

export interface ApiAssignmentSpec {
  week: number;
  session: number;
  title: string;
  path: string;
  endpoints: EndpointSpec[];
}

export interface RepoCheckSpec {
  label: string;
  path: string;
}

export interface RepoCheckAssignmentSpec {
  week: number;
  session: number;
  title: string;
  checks: RepoCheckSpec[];
}

export interface CourseSpecs {
  course: {
    name: string;
    weeks: number;
    sessionsPerWeek: number;
    totalSessions: number;
    repoName: string;
  };
  assignments: AssignmentSpec[];
  repoCheckAssignments?: RepoCheckAssignmentSpec[];
  apiAssignments: ApiAssignmentSpec[];
  grading: {
    functionTests: {
      pointsPerTest: number;
      timeout: number;
      sandbox: boolean;
    };
    apiTests: {
      pointsPerEndpoint: number;
      timeout: number;
    };
  };
}

// Export the specs
export const specs: CourseSpecs = specsData as CourseSpecs;

/**
 * Get assignment spec for a specific week/session
 */
export function getAssignment(week: number, session: number): AssignmentSpec | undefined {
  return specs.assignments.find(a => a.week === week && a.session === session);
}

/**
 * Get API assignment spec for a specific week/session
 */
export function getApiAssignment(week: number, session: number): ApiAssignmentSpec | undefined {
  return specs.apiAssignments.find(a => a.week === week && a.session === session);
}

/**
 * Get repo-check assignment spec for a specific week/session
 */
export function getRepoCheckAssignment(
  week: number,
  session: number
): RepoCheckAssignmentSpec | undefined {
  return (specs.repoCheckAssignments || []).find(a => a.week === week && a.session === session);
}

/**
 * Get all assignments for a week
 */
export function getWeekAssignments(week: number): AssignmentSpec[] {
  return specs.assignments.filter(a => a.week === week);
}

/**
 * List all available assignments
 */
export function listAssignments(): Array<{
  week: number;
  session: number;
  title: string;
  type: 'function' | 'repo-check' | 'api';
}> {
  const functionAssignments = (specs.assignments || []).map(a => ({
    week: a.week,
    session: a.session,
    title: a.title,
    type: 'function' as const
  }));

  const repoCheckAssignments = (specs.repoCheckAssignments || []).map(a => ({
    week: a.week,
    session: a.session,
    title: a.title,
    type: 'repo-check' as const
  }));

  const apiAssignments = (specs.apiAssignments || []).map(a => ({
    week: a.week,
    session: a.session,
    title: a.title,
    type: 'api' as const
  }));

  return [...functionAssignments, ...repoCheckAssignments, ...apiAssignments].sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return a.session - b.session;
  });
}
