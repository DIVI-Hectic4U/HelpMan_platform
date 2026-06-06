import axios from 'axios';

/**
 * Validates that a problem URL actually exists (not a 404).
 * Uses a lightweight HEAD request with a short timeout.
 */
async function isUrlAlive(url: string): Promise<boolean> {
  try {
    const res = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: (status) => status < 400, // 2xx and 3xx are OK
    });
    return true;
  } catch {
    // HEAD might be blocked by some sites, try GET with minimal data
    try {
      const res = await axios.get(url, {
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: (status) => status < 400,
        headers: { 'Range': 'bytes=0-0' }, // Request minimal data
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ── Codeforces Problem Bank (fetched from real API) ──────────────

interface CfProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  tags: string[];
}

let cfProblemCache: CfProblem[] = [];
let cfCacheExpiry = 0;

/**
 * Fetches the full Codeforces problem set from the API.
 * Cached for 24 hours to avoid hammering the API.
 */
async function getCfProblemBank(): Promise<CfProblem[]> {
  if (cfProblemCache.length > 0 && Date.now() < cfCacheExpiry) {
    return cfProblemCache;
  }

  try {
    const res = await axios.get('https://codeforces.com/api/problemset.problems', {
      timeout: 15000,
    });

    if (res.data.status === 'OK') {
      cfProblemCache = res.data.result.problems
        .filter((p: any) => p.contestId && p.rating) // Only rated problems
        .map((p: any) => ({
          contestId: p.contestId,
          index: p.index,
          name: p.name,
          rating: p.rating,
          tags: p.tags || [],
        }));
      cfCacheExpiry = Date.now() + 86400000; // 24h cache
      console.log(`[URL Validator] Cached ${cfProblemCache.length} Codeforces problems`);
    }
  } catch (error) {
    console.error('[URL Validator] Failed to fetch CF problem bank:', error);
  }

  return cfProblemCache;
}

/**
 * Get a random verified Codeforces problem within a difficulty range.
 */
async function getRandomCfProblem(
  minRating: number,
  maxRating: number,
  excludeTitles: string[]
): Promise<{ title: string; url: string; difficulty: number; topic: string; platform: string } | null> {
  const bank = await getCfProblemBank();
  const candidates = bank.filter(
    (p) =>
      p.rating! >= minRating &&
      p.rating! <= maxRating &&
      p.contestId > 1000 && // Modern contests for better quality
      !excludeTitles.some((t) => t.toLowerCase() === p.name.toLowerCase())
  );

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    title: pick.name,
    url: `https://codeforces.com/problemset/problem/${pick.contestId}/${pick.index}`,
    difficulty: pick.rating!,
    topic: pick.tags[0] || 'Implementation',
    platform: 'codeforces',
  };
}

// ── LeetCode Problem Bank (fetched from real API) ────────────────

interface LcProblem {
  titleSlug: string;
  title: string;
  difficulty: string;
}

let lcProblemCache: LcProblem[] = [];
let lcCacheExpiry = 0;

/**
 * Fetches LeetCode problems from their public API.
 * Cached for 24 hours.
 */
async function getLcProblemBank(): Promise<LcProblem[]> {
  if (lcProblemCache.length > 0 && Date.now() < lcCacheExpiry) {
    return lcProblemCache;
  }

  try {
    const res = await axios.get('https://leetcode.com/api/problems/all/', {
      timeout: 15000,
      headers: { 'Accept': 'application/json' },
    });

    if (res.data?.stat_status_pairs) {
      lcProblemCache = res.data.stat_status_pairs
        .filter((p: any) => !p.paid_only) // Free problems only
        .map((p: any) => ({
          titleSlug: p.stat.question__title_slug,
          title: p.stat.question__title,
          difficulty: p.difficulty.level === 1 ? 'Easy' : p.difficulty.level === 2 ? 'Medium' : 'Hard',
        }));
      lcCacheExpiry = Date.now() + 86400000; // 24h cache
      console.log(`[URL Validator] Cached ${lcProblemCache.length} LeetCode problems`);
    }
  } catch (error) {
    console.error('[URL Validator] Failed to fetch LC problem bank:', error);
  }

  return lcProblemCache;
}

/**
 * Get a random verified LeetCode problem.
 */
async function getRandomLcProblem(
  difficulty: 'Easy' | 'Medium' | 'Hard',
  excludeTitles: string[]
): Promise<{ title: string; url: string; difficulty: number; topic: string; platform: string } | null> {
  const bank = await getLcProblemBank();
  const candidates = bank.filter(
    (p) =>
      p.difficulty === difficulty &&
      !excludeTitles.some((t) => t.toLowerCase() === p.title.toLowerCase())
  );

  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const difficultyNum = difficulty === 'Easy' ? 800 : difficulty === 'Medium' ? 1200 : 1600;
  return {
    title: pick.title,
    url: `https://leetcode.com/problems/${pick.titleSlug}/`,
    difficulty: difficultyNum,
    topic: 'Mixed',
    platform: 'leetcode',
  };
}

// ── Main Validator ───────────────────────────────────────────────

interface AiProblem {
  title: string;
  url: string;
  difficulty: number;
  topic: string;
  xpValue: number;
  platform: string;
}

/**
 * Validates all AI-generated problem URLs. Replaces any 404s with
 * real, verified problems from the Codeforces/LeetCode APIs.
 */
export async function validateAndFixProblems(problems: AiProblem[]): Promise<AiProblem[]> {
  const validatedProblems: AiProblem[] = [];
  const usedTitles: string[] = [];

  for (const problem of problems) {
    const alive = await isUrlAlive(problem.url);

    if (alive) {
      console.log(`[URL Validator] ✅ ${problem.title} — URL is valid`);
      validatedProblems.push(problem);
      usedTitles.push(problem.title);
    } else {
      console.warn(`[URL Validator] ❌ ${problem.title} — URL is 404, replacing...`);

      let replacement: Omit<AiProblem, 'xpValue'> | null = null;

      if (problem.platform === 'codeforces') {
        replacement = await getRandomCfProblem(
          Math.max(problem.difficulty - 200, 800),
          problem.difficulty + 200,
          usedTitles
        );
      } else {
        // Map numeric difficulty to LeetCode tier
        const tier = problem.difficulty <= 1000 ? 'Easy' : problem.difficulty <= 1400 ? 'Medium' : 'Hard';
        replacement = await getRandomLcProblem(tier as 'Easy' | 'Medium' | 'Hard', usedTitles);
      }

      if (replacement) {
        console.log(`[URL Validator] 🔄 Replaced with: ${replacement.title}`);
        validatedProblems.push({
          ...replacement,
          xpValue: problem.xpValue,
          topic: replacement.topic || problem.topic,
        });
        usedTitles.push(replacement.title);
      } else {
        // If even the API replacement fails, keep the original (rare edge case)
        console.warn(`[URL Validator] ⚠️ Could not find replacement, keeping original`);
        validatedProblems.push(problem);
      }
    }
  }

  return validatedProblems;
}
