import Groq from 'groq-sdk';
import { aiTaskResponseSchema, type AITaskResponse } from '@helpman/shared';
import { validateAndFixProblems, getProblemCandidates } from './url-validator';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

interface UserProfile {
  codeforcesRating?: number;
  leetcodeSolved?: number;
  weakTopics?: string[];
  currentStreak: number;
  rank: string;
  difficultyPref: string;
  recentSolved?: string[];
}

/**
 * Generate personalized daily coding tasks using Groq AI (Llama 3).
 * Returns validated, structured problem recommendations.
 * All URLs are verified against real APIs before returning.
 */
export async function generateDailyTasks(profile: UserProfile): Promise<AITaskResponse> {
  // Use Codeforces rating -100 to +200
  const minRating = profile.codeforcesRating ? profile.codeforcesRating - 100 : 800;
  const maxRating = profile.codeforcesRating ? profile.codeforcesRating + 200 : 1200;
  
  // Fetch a pool of real problems from the APIs so the AI doesn't hallucinate
  const candidatePool = await getProblemCandidates(minRating, maxRating, 20);
  const prompt = buildPrompt(profile, candidatePool);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a competitive programming coach who knows thousands of obscure problems across Codeforces and LeetCode. You NEVER repeat recommendations. Every response must contain completely different problems.' },
        { role: 'user', content: prompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.9,       // High creativity for maximum diversity
      top_p: 0.95,            // Broader token sampling pool
      response_format: { type: 'json_object' }
    });

    const text = chatCompletion.choices[0]?.message?.content || '{}';

    // Parse the strict JSON returned by Groq
    const parsed = JSON.parse(text);

    // Validate with our forgiving Zod schema
    const validated = aiTaskResponseSchema.parse(parsed);

    // Verify all problem URLs are real (not hallucinated 404s)
    // Replace any broken links with verified problems from the CF/LC APIs
    console.log('[AI] Validating problem URLs...');
    validated.problems = await validateAndFixProblems(validated.problems as any) as any;

    return validated;

  } catch (error) {
    console.error('[Groq AI] Error generating tasks:', error);

    // Return fallback tasks if something crashes
    return getFallbackTasks(profile);
  }
}

/**
 * Generates a unique daily random seed to force the LLM to produce
 * different outputs even when the rest of the prompt is similar.
 */
function getDailyRandomSeed(): string {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2026-06-06"
  const randomHex = Math.random().toString(36).substring(2, 10); // e.g. "k7f2x9ab"
  return `${today}-${randomHex}`;
}

/** Pick N random items from a larger pool to vary the topic focus each day */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

const ALL_CODING_TOPICS = [
  'Binary Search', 'Two Pointers', 'Sliding Window', 'Stack', 'Queue',
  'Heap', 'Hashing', 'Linked List', 'Trees', 'Graphs', 'BFS', 'DFS',
  'Dynamic Programming', 'Greedy', 'Backtracking', 'Divide and Conquer',
  'Bit Manipulation', 'Math', 'Number Theory', 'Combinatorics',
  'String Algorithms', 'Trie', 'Union Find', 'Segment Tree',
  'Shortest Path', 'Topological Sort', 'Game Theory', 'Geometry',
  'Sorting', 'Simulation', 'Constructive Algorithms', 'Implementation',
];

const ALL_THEORY_TOPICS = [
  'System Design', 'OOP Principles', 'SOLID Principles', 'Design Patterns',
  'Database Normalization', 'SQL vs NoSQL', 'ACID Properties', 'CAP Theorem',
  'Operating Systems', 'Process Scheduling', 'Memory Management', 'Deadlocks',
  'Networking', 'TCP vs UDP', 'HTTP/HTTPS', 'DNS', 'Load Balancing',
  'Caching Strategies', 'Microservices', 'API Design', 'REST vs GraphQL',
  'Message Queues', 'Distributed Systems', 'Consistent Hashing',
  'Virtual Memory', 'Paging', 'Threads vs Processes', 'Mutex vs Semaphore',
];

function buildPrompt(profile: UserProfile, candidatePool: string): string {
  const ratingRange = profile.codeforcesRating
    ? `[${profile.codeforcesRating - 100}, ${profile.codeforcesRating + 200}]`
    : '[800, 1200]';

  // Inject randomness: pick a subset of topics to focus on today
  const todaysTheoryTopics = pickRandom(ALL_THEORY_TOPICS, 4);
  const seed = getDailyRandomSeed();

  return `You are an expert competitive programming coach. Generate a UNIQUE daily practice plan.

SESSION SEED: ${seed}
(This seed ensures you generate COMPLETELY DIFFERENT reading tasks from any previous session.)

TODAY'S THEORY FOCUS TOPICS:
- ${todaysTheoryTopics.join(', ')}

AVAILABLE CODING PROBLEMS POOL:
${candidatePool}

STUDENT PROFILE:
- Codeforces Rating: ${profile.codeforcesRating || 'Unrated'}
- LeetCode Problems Solved: ${profile.leetcodeSolved || 0}
- Weak Topics: ${profile.weakTopics?.join(', ') || 'unknown'}
- Current Streak: ${profile.currentStreak} days
- Rank: ${profile.rank}
- Difficulty Preference: ${profile.difficultyPref}

RULES:
1. Generate EXACTLY 3 coding problems. YOU MUST SELECT EXACTLY 2 LEETCODE PROBLEMS AND EXACTLY 1 CODEFORCES PROBLEM.
2. YOU MUST CHOOSE THESE 3 PROBLEMS EXACTLY FROM THE "AVAILABLE CODING PROBLEMS POOL" ABOVE. Do NOT invent problems. Do NOT guess URLs. Copy the Title, URL, and Difficulty exactly as provided in the pool.
3. Generate EXACTLY 2 theory/reading tasks from today's theory focus topics. Provide a short description and optionally a url to read more.
4. Try to select coding problems from the pool that match the student's weak topics if possible.
5. CRITICAL: DO NOT recommend any problems the student has already solved: ${profile.recentSolved?.length ? profile.recentSolved.join(', ') : 'None specified'}
6. Include a motivational study tip

OUTPUT FORMAT (STRICT JSON ONLY — YOU MUST RETURN A VALID JSON OBJECT):
{
  "problems": [
    {
      "title": "Problem Title",
      "url": "https://leetcode.com/problems/example/ OR https://codeforces.com/problemset/problem/...",
      "difficulty": 1200,
      "topic": "Dynamic Programming",
      "xpValue": 50,
      "platform": "leetcode"
    }
  ],
  "theoryTasks": [
    {
      "title": "What is Polymorphism?",
      "topic": "OOP",
      "description": "Understand compile-time vs run-time polymorphism with examples.",
      "url": "https://en.wikipedia.org/wiki/Polymorphism_(computer_science)",
      "xpValue": 20
    }
  ],
  "studyTip": "Focus on understanding the pattern before coding",
  "encouragement": "You're on a ${profile.currentStreak}-day streak! Keep going! 🔥"
}`;
}

function getFallbackTasks(profile: UserProfile): AITaskResponse {
  const difficulty = profile.codeforcesRating || 1000;

  return {
    problems: [
      {
        title: 'Two Sum',
        url: 'https://leetcode.com/problems/two-sum/',
        difficulty: Math.max(difficulty - 200, 800),
        topic: 'Arrays',
        xpValue: 25,
        platform: 'leetcode',
      },
      {
        title: 'Watermelon',
        url: 'https://codeforces.com/problemset/problem/4/A',
        difficulty: 800,
        topic: 'Math',
        xpValue: 25,
        platform: 'codeforces',
      },
      {
        title: 'Valid Parentheses',
        url: 'https://leetcode.com/problems/valid-parentheses/',
        difficulty: Math.max(difficulty - 100, 800),
        topic: 'Stack',
        xpValue: 25,
        platform: 'leetcode',
      },
    ],
    theoryTasks: [
      {
        title: 'CAP Theorem',
        topic: 'System Design',
        description: 'Learn about Consistency, Availability, and Partition Tolerance in distributed systems.',
        xpValue: 20,
        platform: 'theory',
      },
      {
        title: 'Four Pillars of OOP',
        topic: 'OOP',
        description: 'Review Encapsulation, Abstraction, Inheritance, and Polymorphism.',
        xpValue: 20,
        platform: 'theory',
      }
    ],
    studyTip: 'Practice consistently — even 30 minutes daily makes a huge difference!',
    encouragement: `Day ${profile.currentStreak} of your streak! You're building something amazing! 💪`,
  };
}
