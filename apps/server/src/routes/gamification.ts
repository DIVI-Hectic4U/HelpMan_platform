import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getXpToNextRank } from '../services/xp-engine';

export const gamificationRoutes = Router();

// ── Get Leaderboard ──────────────────────────────────────────
gamificationRoutes.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const period = req.query.period as string || 'all'; // 'all', 'weekly', 'monthly'

    const users = await prisma.user.findMany({
      orderBy: { currentXp: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        currentXp: true,
        rank: true,
        currentStreak: true,
        avatarUrl: true,
      },
    });

    const leaderboard = users.map((user, index) => ({
      position: index + 1,
      ...user,
    }));

    return res.json(leaderboard);
  } catch (error) {
    console.error('[Gamification] Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── Get User Stats ───────────────────────────────────────────
gamificationRoutes.get('/stats', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        currentXp: true, rank: true, currentStreak: true,
        longestStreak: true, createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const rankProgress = getXpToNextRank(user.currentXp, user.rank);

    // Count completed tasks
    const tasksCompleted = await prisma.dailyTask.count({
      where: { userId: req.userId!, status: 'COMPLETED' },
    });

    // Total XP earned (all time)
    const xpEarned = await prisma.xpTransaction.aggregate({
      where: { userId: req.userId! },
      _sum: { amount: true },
    });

    // Recent XP transactions
    const recentXp = await prisma.xpTransaction.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Leaderboard position
    const position = await prisma.user.count({
      where: { currentXp: { gt: user.currentXp } },
    });

    return res.json({
      ...user,
      rankProgress,
      tasksCompleted,
      totalXpEarned: xpEarned._sum.amount || 0,
      recentXp,
      leaderboardPosition: position + 1,
      memberSince: user.createdAt,
    });
  } catch (error) {
    console.error('[Gamification] Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Get XP History ───────────────────────────────────────────
gamificationRoutes.get('/xp-history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const transactions = await prisma.xpTransaction.findMany({
      where: {
        userId: req.userId!,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(transactions);
  } catch (error) {
    console.error('[Gamification] XP history error:', error);
    return res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});
