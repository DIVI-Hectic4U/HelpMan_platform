import cron from 'node-cron';
import prisma from '../lib/prisma';
import { getRankFromXp } from '@helpman/shared';

/**
 * Start all CRON jobs.
 */
export function startCronJobs(): void {
  console.log('[CRON] Starting scheduled jobs...');

  // ── Nightly Rank Reconciliation (midnight daily) ──────────
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running nightly rank reconciliation...');
    try {
      const users = await prisma.user.findMany({
        select: { id: true, currentXp: true, rank: true },
      });

      let updated = 0;
      for (const user of users) {
        const correctRank = getRankFromXp(user.currentXp);
        if (correctRank !== user.rank) {
          await prisma.user.update({
            where: { id: user.id },
            data: { rank: correctRank },
          });
          updated++;
        }
      }

      console.log(`[CRON] Rank reconciliation complete. Updated ${updated} users.`);
    } catch (error) {
      console.error('[CRON] Rank reconciliation failed:', error);
    }
  });

  // ── Expire old tasks (6 AM daily) ─────────────────────────
  cron.schedule('0 6 * * *', async () => {
    console.log('[CRON] Expiring stale tasks...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const result = await prisma.dailyTask.updateMany({
        where: {
          status: 'PENDING',
          taskDate: { lt: yesterday },
        },
        data: { status: 'EXPIRED' },
      });

      console.log(`[CRON] Expired ${result.count} stale tasks.`);
    } catch (error) {
      console.error('[CRON] Task expiry failed:', error);
    }
  });

  // ── Reset broken streaks (7 AM daily) ─────────────────────
  cron.schedule('0 7 * * *', async () => {
    console.log('[CRON] Checking for broken streaks...');
    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const result = await prisma.user.updateMany({
        where: {
          currentStreak: { gt: 0 },
          lastActiveDate: { lt: twoDaysAgo },
        },
        data: { currentStreak: 0 },
      });

      console.log(`[CRON] Reset ${result.count} broken streaks.`);
    } catch (error) {
      console.error('[CRON] Streak reset failed:', error);
    }
  });

  console.log('[CRON] All jobs scheduled ✓');
}
