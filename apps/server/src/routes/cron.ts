import { Router } from 'express';
import prisma from '../lib/prisma';
import { getRankFromXp } from '@helpman/shared';

export const cronRoutes = Router();

// Vercel Cron triggers this endpoint
cronRoutes.get('/trigger-daily', async (req, res) => {
  // Verify authorization header from Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[CRON] Starting Vercel scheduled jobs...');

  try {
    // 1. Rank Reconciliation
    const users = await prisma.user.findMany({ select: { id: true, currentXp: true, rank: true } });
    let updated = 0;
    for (const user of users) {
      const correctRank = getRankFromXp(user.currentXp);
      if (correctRank !== user.rank) {
        await prisma.user.update({ where: { id: user.id }, data: { rank: correctRank } });
        updated++;
      }
    }
    console.log(`[CRON] Rank reconciliation complete. Updated ${updated} users.`);

    // 2. Expire old tasks
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const expiredResult = await prisma.dailyTask.updateMany({
      where: { status: 'PENDING', taskDate: { lt: yesterday } },
      data: { status: 'EXPIRED' },
    });
    console.log(`[CRON] Expired ${expiredResult.count} stale tasks.`);

    // 3. Reset broken streaks
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const streakResult = await prisma.user.updateMany({
      where: { currentStreak: { gt: 0 }, lastActiveDate: { lt: twoDaysAgo } },
      data: { currentStreak: 0 },
    });
    console.log(`[CRON] Reset ${streakResult.count} broken streaks.`);

    return res.json({ success: true, updatedRanks: updated, expiredTasks: expiredResult.count, resetStreaks: streakResult.count });
  } catch (error) {
    console.error('[CRON] Failed:', error);
    return res.status(500).json({ error: 'Cron failed' });
  }
});
