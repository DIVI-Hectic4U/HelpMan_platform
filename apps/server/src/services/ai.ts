import Groq from 'groq-sdk';
import { aiTaskResponseSchema, type AITaskResponse } from '@helpman/shared';

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
 */
export async function generateDailyTasks(profile: UserProfile): Promise<AITaskResponse> {
  const prompt = buildPrompt(profile);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile', // Fast and highly capable model
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const text = chatCompletion.choices[0]?.message?.content || '{}';

    // Parse the strict JSON returned by Groq
    const parsed = JSON.parse(text);

    // Validate with our forgiving Zod schema
    const validated = aiTaskResponseSchema.parse(parsed);
    return validated;

  } catch (error) {
    console.error('[Groq AI] Error generating tasks:', error);

    // Return fallback tasks if something crashes
    return getFallbackTasks(profile);
  }
}

function buildPrompt(profile: UserProfile): string {
  const ratingRange = profile.codeforcesRating
    ? `[${profile.codeforcesRating - 200}, ${profile.codeforcesRating + 100}]`
    : '[800, 1200]';

  return `You are an expert competitive programming coach. Generate a personalized daily practice plan.

STUDENT PROFILE:
- Codeforces Rating: ${profile.codeforcesRating || 'Unrated'}
- LeetCode Problems Solved: ${profile.leetcodeSolved || 0}
- Weak Topics: ${profile.weakTopics?.join(', ') || 'unknown'}
- Current Streak: ${profile.currentStreak} days
- Rank: ${profile.rank}
- Difficulty Preference: ${profile.difficultyPref}

RULES:
1. Generate EXACTLY 3 practice problems
2. Problem difficulty should be within rating range ${ratingRange}
3. Include at least 1 problem from a weak topic if known
4. Mix platforms (Codeforces and LeetCode)
5. CRITICAL: DO NOT recommend any of these problems, as the user has already solved them: ${profile.recentSolved?.length ? profile.recentSolved.join(', ') : 'None specified'}
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
    studyTip: 'Practice consistently — even 30 minutes daily makes a huge difference!',
    encouragement: `Day ${profile.currentStreak} of your streak! You're building something amazing! 💪`,
  };
}
