import { VM } from 'vm2';

export interface TestCase {
  input: any[];
  expected?: any;
  throws?: string;
  tolerance?: number;
  deepEqual?: boolean;
  matchesShape?: Record<string, string>;
}

export interface TestResult {
  functionName: string;
  testIndex: number;
  passed: boolean;
  input: any[];
  expected: any;
  actual?: any;
  error?: string;
}

export interface GradeResult {
  score: number;
  maxScore: number;
  results: TestResult[];
  error?: string;
}

/**
 * Execute student code in a sandboxed environment
 */
export function executeInSandbox(
  code: string,
  functionName: string,
  args: any[],
  timeout: number = 2000
): { result?: any; error?: string } {
  try {
    const vm = new VM({
      timeout,
      sandbox: {},
      eval: false,
      wasm: false,
    });

    // Special-case: some specs represent a callback as a string like "() => 5".
    // We cannot eval inside the sandbox (eval is disabled). Instead, embed the
    // function literal directly in the VM code.
    if (
      functionName === 'trySafely' &&
      Array.isArray(args) &&
      args.length === 1 &&
      typeof args[0] === 'string'
    ) {
      const fnExpr = args[0].trim();
      const looksLikeFunction = fnExpr.startsWith('function') || fnExpr.includes('=>');
      if (!looksLikeFunction) {
        return { error: 'Invalid function expression' };
      }

      const invocationCode = `
        const module = { exports: {} };
        const exports = module.exports;

        ${code}

        const __fn = (${fnExpr});
        if (!module.exports || typeof module.exports['${functionName}'] !== 'function') {
          throw new Error("Function '${functionName}' not found or not exported");
        }
        module.exports['${functionName}'](__fn);
      `;

      const result = vm.run(invocationCode);
      return { result };
    }

    // Wrap code to extract the function
    const wrappedCode = `
      ${code}
      
      if (typeof module !== 'undefined' && module.exports) {
        if (typeof module.exports.${functionName} === 'function') {
          module.exports.${functionName};
        } else if (typeof module.exports === 'function') {
          module.exports;
        } else {
          null;
        }
      } else if (typeof ${functionName} === 'function') {
        ${functionName};
      } else {
        null;
      }
    `;

    // Create a mock module.exports
    const moduleCode = `
      const module = { exports: {} };
      const exports = module.exports;
      
      ${code}
      
      module.exports;
    `;

    const moduleExports = vm.run(moduleCode);
    
    if (!moduleExports || typeof moduleExports[functionName] !== 'function') {
      return { error: `Function '${functionName}' not found or not exported` };
    }

    const fn = moduleExports[functionName];
    const result = fn(...args);
    
    return { result };
  } catch (error: any) {
    return { error: error.message || 'Execution error' };
  }
}

/**
 * Compare two values for equality
 */
function valuesEqual(actual: any, expected: any, options?: { tolerance?: number; deepEqual?: boolean }): boolean {
  // Handle null/undefined
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (actual === undefined || expected === undefined) return actual === expected;

  // Handle numbers with tolerance
  if (typeof actual === 'number' && typeof expected === 'number') {
    if (options?.tolerance) {
      return Math.abs(actual - expected) <= options.tolerance;
    }
    return actual === expected;
  }

  // Handle arrays
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    return actual.every((val, idx) => valuesEqual(val, expected[idx], options));
  }

  // Handle objects
  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    
    if (actualKeys.length !== expectedKeys.length) return false;
    if (!actualKeys.every((key, idx) => key === expectedKeys[idx])) return false;
    
    return actualKeys.every(key => valuesEqual(actual[key], expected[key], options));
  }

  // Strict equality for everything else
  return actual === expected;
}

/**
 * Check if value matches expected shape
 */
function matchesShape(value: any, shape: Record<string, any>): boolean {
  if (typeof value !== 'object' || value === null) return false;
  
  for (const [key, expected] of Object.entries(shape)) {
    if (!(key in value)) return false;
    
    if (typeof expected === 'string') {
      const actualType = Array.isArray(value[key]) ? 'array' : typeof value[key];
      if (actualType !== expected) return false;
    } else {
      if (value[key] !== expected) return false;
    }
  }
  
  return true;
}

/**
 * Run test cases against student code
 */
export function gradeCode(
  code: string,
  functionName: string,
  testCases: TestCase[]
): GradeResult {
  const results: TestResult[] = [];
  let score = 0;
  const maxScore = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const result: TestResult = {
      functionName,
      testIndex: i,
      passed: false,
      input: testCase.input,
      expected: testCase.expected
    };

    try {
      const execution = executeInSandbox(code, functionName, testCase.input);

      if (execution.error) {
        // Check if we expected an error
        if (testCase.throws && execution.error.includes(testCase.throws)) {
          result.passed = true;
          score++;
        } else {
          result.error = execution.error;
        }
      } else {
        result.actual = execution.result;

        // Check for expected throw that didn't happen
        if (testCase.throws) {
          result.error = `Expected error containing "${testCase.throws}"`;
        } 
        // Check shape match
        else if (testCase.matchesShape) {
          result.passed = matchesShape(execution.result, testCase.matchesShape);
        }
        // Normal value comparison
        else {
          result.passed = valuesEqual(
            execution.result, 
            testCase.expected,
            { tolerance: testCase.tolerance, deepEqual: testCase.deepEqual }
          );
        }

        if (result.passed) {
          score++;
        }
      }
    } catch (error: any) {
      result.error = error.message || 'Test execution failed';
    }

    results.push(result);
  }

  return { score, maxScore, results };
}

/**
 * Grade a complete assignment file
 */
export function gradeAssignment(
  code: string,
  functions: Array<{
    name: string;
    tests: TestCase[];
    skipAutoTest?: boolean;
  }>
): GradeResult {
  let totalScore = 0;
  let totalMaxScore = 0;
  const allResults: TestResult[] = [];

  for (const func of functions) {
    if (func.skipAutoTest) continue;

    const { score, maxScore, results } = gradeCode(code, func.name, func.tests);
    totalScore += score;
    totalMaxScore += maxScore;
    allResults.push(...results);
  }

  return {
    score: totalScore,
    maxScore: totalMaxScore,
    results: allResults
  };
}
