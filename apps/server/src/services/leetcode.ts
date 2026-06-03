import axios from 'axios';

interface LeetCodeUser {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  contestRating: number;
  contestsAttended: number;
}

interface LeetCodeSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
}

const LC_GRAPHQL = 'https://leetcode.com/graphql';

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 3600000; // 1 hour

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

/**
 * Fetch LeetCode user profile via GraphQL.
 */
export async function getLeetCodeUser(username: string): Promise<LeetCodeUser | null> {
  const cacheKey = `lc_user_${username}`;
  const cached = getCached<LeetCodeUser>(cacheKey);
  if (cached) return cached;

  try {
    // Profile + solve stats
    const profileRes = await axios.post(LC_GRAPHQL, {
      query: `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
            }
            submitStatsGlobal {
              acSubmissionNum {
                difficulty
                count
              }
            }
          }
        }
      `,
      variables: { username },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const user = profileRes.data?.data?.matchedUser;
    if (!user) return null;

    const stats = user.submitStatsGlobal?.acSubmissionNum || [];
    const getCount = (diff: string) => stats.find((s: any) => s.difficulty === diff)?.count || 0;

    // Contest rating
    let contestRating = 0;
    let contestsAttended = 0;
    try {
      const contestRes = await axios.post(LC_GRAPHQL, {
        query: `
          query userContestRankingInfo($username: String!) {
            userContestRanking(username: $username) {
              rating
              attendedContestsCount
            }
          }
        `,
        variables: { username },
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      const ranking = contestRes.data?.data?.userContestRanking;
      if (ranking) {
        contestRating = Math.round(ranking.rating || 0);
        contestsAttended = ranking.attendedContestsCount || 0;
      }
    } catch {
      // Contest rating is optional
    }

    const result: LeetCodeUser = {
      username: user.username,
      totalSolved: getCount('All'),
      easySolved: getCount('Easy'),
      mediumSolved: getCount('Medium'),
      hardSolved: getCount('Hard'),
      ranking: user.profile?.ranking || 0,
      contestRating,
      contestsAttended,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error(`[LeetCode] Failed to fetch user ${username}:`, error);
    return null;
  }
}

/**
 * Fetch recent AC submissions for a user.
 */
export async function getLeetCodeSubmissions(
  username: string,
  limit: number = 20
): Promise<LeetCodeSubmission[]> {
  const cacheKey = `lc_subs_${username}_${limit}`;
  const cached = getCached<LeetCodeSubmission[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.post(LC_GRAPHQL, {
      query: `
        query recentSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }
      `,
      variables: { username, limit },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const submissions = response.data?.data?.recentAcSubmissionList || [];
    setCache(cacheKey, submissions);
    return submissions;
  } catch (error) {
    console.error(`[LeetCode] Failed to fetch submissions for ${username}:`, error);
    return [];
  }
}
