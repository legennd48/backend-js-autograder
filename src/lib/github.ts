const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  encoding: string;
}

/**
 * Fetch a file from a GitHub repository
 */
export async function fetchGitHubFile(
  username: string,
  repo: string,
  path: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'BackendJS-AutoGrader'
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // File not found
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.encoding !== 'base64') {
      throw new Error('Unexpected file encoding');
    }

    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return content;
  } catch (error) {
    console.error(`Error fetching file ${path}:`, error);
    throw error;
  }
}

/**
 * Check if a repository exists and is accessible
 */
export async function checkRepoExists(
  username: string,
  repo: string
): Promise<boolean> {
  const url = `https://api.github.com/repos/${username}/${repo}`;
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'BackendJS-AutoGrader'
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(url, { headers });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if a path (file or directory) exists in a GitHub repository.
 * Uses the Contents API and only checks status codes (no base64 decoding).
 */
export async function checkGitHubPathExists(
  username: string,
  repo: string,
  path: string
): Promise<boolean> {
  const url = `https://api.github.com/repos/${username}/${repo}/contents/${path}`;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'BackendJS-AutoGrader'
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (response.status === 404) return false;
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }
  return true;
}

/**
 * Get rate limit info
 */
export async function getRateLimitInfo(): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const url = 'https://api.github.com/rate_limit';
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'BackendJS-AutoGrader'
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  const data = await response.json();

  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000)
  };
}
