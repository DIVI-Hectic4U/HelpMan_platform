import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { geminiLimiter } from '../middleware/rateLimiter';
import { generateDailyTasks } from '../services/gemini';
import { getCodeforcesUser, getCodeforcesSubmissions, analyzeWeakTopics } from '../services/codeforces';
import { getLeetCodeUser } from '../services/leetcode';
import { awardXp, updateStreak } from '../services/xp-engine';
import { XP_VALUES } from '@helpman/shared';

export const taskRoutes = Router();

// ── Get Today's Tasks ────────────────────────────────────────
taskRoutes.get('/today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTask = await prisma.dailyTask.findFirst({
      where: {
        userId: req.userId!,
        taskDate: { gte: today },
      },
      orderBy: { taskDate: 'desc' },
    });

    if (existingTask) {
      return res.json(existingTask);
    }

    return res.json(null);
  } catch (error) {
    console.error('[Tasks] Fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ── Generate New Daily Tasks (AI-Powered) ────────────────────
taskRoutes.post('/generate', requireAuth, geminiLimiter, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { preferences: true, profileCaches: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Check if tasks already generated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTask = await prisma.dailyTask.findFirst({
      where: { userId: user.id, taskDate: { gte: today } },
    });

    if (existingTask) {
      return res.json({ task: existingTask, message: 'Tasks already generated for today' });
    }

    // Fetch profile data from platforms
    let cfRating: number | undefined;
    let lcSolved: number | undefined;
    let weakTopics: string[] = [];

    if (user.codeforcesHandle) {
      const cfUser = await getCodeforcesUser(user.codeforcesHandle);
      if (cfUser) {
        cfRating = cfUser.rating;
        // Cache profile
        await prisma.profileCache.upsert({
          where: { userId_platform: { userId: user.id, platform: 'codeforces' } },
          update: { rating: cfUser.rating, rawData: cfUser as any, fetchedAt: new Date() },
          create: { userId: user.id, platform: 'codeforces', rating: cfUser.rating, rawData: cfUser as any },
        });

        const submissions = await getCodeforcesSubmissions(user.codeforcesHandle);
        weakTopics = analyzeWeakTopics(submissions);
      }
    }

    if (user.leetcodeHandle) {
      const lcUser = await getLeetCodeUser(user.leetcodeHandle);
      if (lcUser) {
        lcSolved = lcUser.totalSolved;
        await prisma.profileCache.upsert({
          where: { userId_platform: { userId: user.id, platform: 'leetcode' } },
          update: { rating: lcUser.contestRating, problemsSolved: lcUser.totalSolved, rawData: lcUser as any, fetchedAt: new Date() },
          create: { userId: user.id, platform: 'leetcode', rating: lcUser.contestRating, problemsSolved: lcUser.totalSolved, rawData: lcUser as any },
        });
      }
    }

    // Generate tasks with AI
    const aiResponse = await generateDailyTasks({
      codeforcesRating: cfRating,
      leetcodeSolved: lcSolved,
      weakTopics,
      currentStreak: user.currentStreak,
      rank: user.rank,
      difficultyPref: user.preferences?.difficultyPref || 'adaptive',
    });

    // Update streak
    const streakResult = await updateStreak(user.id);

    // Award daily login XP
    await awardXp(user.id, XP_VALUES.DAILY_LOGIN, 'daily_login');

    // Save tasks
    const task = await prisma.dailyTask.create({
      data: {
        userId: user.id,
        taskDate: new Date(),
        problems: aiResponse.problems as any,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      task,
      streak: streakResult,
      studyTip: aiResponse.studyTip,
      encouragement: aiResponse.encouragement,
    });
  } catch (error) {
    console.error('[Tasks] Generation error:', error);
    return res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// ── Mark Problem as Done ─────────────────────────────────────
taskRoutes.post('/complete/:taskId/:problemIndex', requireAuth, async (req: AuthRequest, res) => {
  try {
    const taskId = req.params.taskId as string;
    const idx = parseInt(req.params.problemIndex as string);

    const task = await prisma.dailyTask.findFirst({
      where: { id: taskId as string, userId: req.userId! },
    });

    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Task already completed' });
    }

    const problems = task.problems as any[];
    if (idx < 0 || idx >= problems.length) {
      return res.status(400).json({ error: 'Invalid problem index' });
    }

    const problem = problems[idx];
    const xpResult = await awardXp(req.userId!, problem.xpValue || XP_VALUES.MEDIUM_SOLVE, 'daily_solve', {
      problemTitle: problem.title,
      platform: problem.platform,
    });

    // Check if all problems completed
    // For simplicity, mark as completed when any problem is done
    // A more complex version would track individual problem completion
    await prisma.dailyTask.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        xpAwarded: xpResult.xpAwarded,
        completedAt: new Date(),
      },
    });

    return res.json({
      message: 'Problem completed!',
      xp: xpResult,
    });
  } catch (error) {
    console.error('[Tasks] Complete error:', error);
    return res.status(500).json({ error: 'Failed to mark as completed' });
  }
});

// ── Task History ─────────────────────────────────────────────
taskRoutes.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const tasks = await prisma.dailyTask.findMany({
      where: { userId: req.userId! },
      orderBy: { taskDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.dailyTask.count({ where: { userId: req.userId! } });

    return res.json({ tasks, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Tasks] History error:', error);
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});
