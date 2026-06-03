import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, requireAdmin, type AuthRequest } from '../middleware/auth';

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.use(requireAdmin);

// ── Dashboard Stats ──────────────────────────────────────────
adminRoutes.get('/stats', async (_req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = await prisma.user.count({
      where: { lastActiveDate: { gte: today } },
    });

    const totalTasks = await prisma.dailyTask.count();
    const completedTasks = await prisma.dailyTask.count({
      where: { status: 'COMPLETED' },
    });

    const avgXp = await prisma.user.aggregate({
      _avg: { currentXp: true },
    });

    const rankDistribution = await prisma.user.groupBy({
      by: ['rank'],
      _count: { rank: true },
    });

    return res.json({
      totalUsers,
      activeToday,
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0,
      avgXp: Math.round(avgXp._avg.currentXp || 0),
      rankDistribution,
    });
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── List Users ───────────────────────────────────────────────
adminRoutes.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, email: true, rank: true,
        currentXp: true, currentStreak: true, whatsappLinked: true,
        role: true, createdAt: true, lastActiveDate: true,
        leetcodeHandle: true, codeforcesHandle: true,
      },
    });

    const total = await prisma.user.count({ where });

    return res.json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin] Users list error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── Update User Role ─────────────────────────────────────────
adminRoutes.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, role: true },
    });

    return res.json(user);
  } catch (error) {
    console.error('[Admin] Role update error:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Recent Activity ──────────────────────────────────────────
adminRoutes.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const recentTasks = await prisma.dailyTask.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return res.json(recentTasks);
  } catch (error) {
    console.error('[Admin] Activity error:', error);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});
