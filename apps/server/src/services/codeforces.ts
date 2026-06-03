import axios from 'axios';

interface CodeforcesUser {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  contribution: number;
}

interface CodeforcesSubmission {
  id: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    rating?: number;
    tags: string[];
  };
  verdict: string;
  createdAt: number;
}

const CF_API_BASE = 'https://codeforces.com/api';

// Simple in-memory cache (TTL: 1 hour)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 3600000; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

/**
 * Fetch user info from Codeforces API.
 */
export async function getCodeforcesUser(handle: string): Promise<CodeforcesUser | null> {
  const cacheKey = `cf_user_${handle}`;
  const cached = getCached<CodeforcesUser>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${CF_API_BASE}/user.info`, {
      params: { handles: handle },
      timeout: 10000,
    });

    if (response.data.status === 'OK' && response.data.result.length > 0) {
      const user = response.data.result[0];
      const result: CodeforcesUser = {
        handle: user.handle,
        rating: user.rating || 0,
        maxRating: user.maxRating || 0,
        rank: user.rank || 'unrated',
        contribution: user.contribution || 0,
      };
      setCache(cacheKey, result);
      return result;
    }
    return null;
  } catch (error) {
    console.error(`[Codeforces] Failed to fetch user ${handle}:`, error);
    return null;
  }
}

/**
 * Fetch recent submissions for a user.
 */
export async function getCodeforcesSubmissions(
  handle: string,
  count: number = 20
): Promise<CodeforcesSubmission[]> {
  const cacheKey = `cf_subs_${handle}_${count}`;
  const cached = getCached<CodeforcesSubmission[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(`${CF_API_BASE}/user.status`, {
      params: { handle, from: 1, count },
      timeout: 10000,
    });

    if (response.data.status === 'OK') {
      const submissions: CodeforcesSubmission[] = response.data.result.map((s: any) => ({
        id: s.id,
        problem: {
          contestId: s.problem.contestId,
          index: s.problem.index,
          name: s.problem.name,
          rating: s.problem.rating,
          tags: s.problem.tags || [],
        },
        verdict: s.verdict,
        createdAt: s.creationTimeSeconds,
      }));
      setCache(cacheKey, submissions);
      return submissions;
    }
    return [];
  } catch (error) {
    console.error(`[Codeforces] Failed to fetch submissions for ${handle}:`, error);
    return [];
  }
}

/**
 * Analyze user's weak topics from recent submissions.
 */
export function analyzeWeakTopics(submissions: CodeforcesSubmission[]): string[] {
  const topicStats = new Map<string, { attempts: number; solved: number }>();

  for (const sub of submissions) {
    for (const tag of sub.problem.tags) {
      const stats = topicStats.get(tag) || { attempts: 0, solved: 0 };
      stats.attempts++;
      if (sub.verdict === 'OK') stats.solved++;
      topicStats.set(tag, stats);
    }
  }

  // Topics with <50% solve rate
  const weakTopics: string[] = [];
  for (const [topic, stats] of topicStats) {
    if (stats.attempts >= 2 && stats.solved / stats.attempts < 0.5) {
      weakTopics.push(topic);
    }
  }

  return weakTopics.slice(0, 5);
}
