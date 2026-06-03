import prisma from '../lib/prisma';
import {
  calculateStreakMultiplier,
  getRankFromXp,
  XP_VALUES,
  RANK_THRESHOLDS,
  RANK_EMOJIS,
  type RankTier,
} from '@helpman/shared';

interface XpAwardResult {
  xpAwarded: number;
  multiplier: number;
  newTotalXp: number;
  rankUp: boolean;
  previousRank: string;
  newRank: string;
}

/**
 * Award XP to a user with streak multiplier and rank checking.
 */
export async function awardXp(
  userId: string,
  baseXp: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<XpAwardResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentXp: true, currentStreak: true, rank: true },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  const multiplier = calculateStreakMultiplier(user.currentStreak);
  const xpAwarded = Math.round(baseXp * multiplier);
  const newTotalXp = user.currentXp + xpAwarded;
  const previousRank = user.rank;
  const newRank = getRankFromXp(newTotalXp);
  const rankUp = newRank !== previousRank;

  // Create XP transaction
  await prisma.xpTransaction.create({
    data: {
      userId,
      amount: xpAwarded,
      reason,
      metadata: metadata ? metadata : undefined,
    },
  });

  // Update user XP and rank
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentXp: newTotalXp,
      rank: newRank,
    },
  });

  // If rank up, create bonus XP transaction
  if (rankUp) {
    await prisma.xpTransaction.create({
      data: {
        userId,
        amount: XP_VALUES.RANK_UP_BONUS,
        reason: 'rank_up',
        metadata: { from: previousRank, to: newRank },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentXp: newTotalXp + XP_VALUES.RANK_UP_BONUS,
      },
    });
  }

  return {
    xpAwarded,
    multiplier,
    newTotalXp: rankUp ? newTotalXp + XP_VALUES.RANK_UP_BONUS : newTotalXp,
    rankUp,
    previousRank,
    newRank,
  };
}

/**
 * Update user streak based on activity.
 */
export async function updateStreak(userId: string): Promise<{
  newStreak: number;
  streakContinued: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
  });

  if (!user) throw new Error(`User ${userId} not found`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.lastActiveDate
    ? new Date(user.lastActiveDate)
    : null;

  if (lastActive) {
    lastActive.setHours(0, 0, 0, 0);
  }

  let newStreak: number;
  let streakContinued: boolean;

  if (!lastActive) {
    // First activity
    newStreak = 1;
    streakContinued = false;
  } else {
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      // Same day - no change
      return { newStreak: user.currentStreak, streakContinued: true };
    } else if (diffDays === 1) {
      // Consecutive day - extend streak
      newStreak = user.currentStreak + 1;
      streakContinued = true;
    } else if (diffDays === 2) {
      // Grace period (1 day gap) — keep streak but don't increment
      newStreak = user.currentStreak;
      streakContinued = true;
    } else {
      // Streak broken
      newStreak = 1;
      streakContinued = false;
    }
  }

  const longestStreak = Math.max(user.longestStreak, newStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: new Date(),
    },
  });

  return { newStreak, streakContinued };
}

/**
 * Get XP needed for next rank.
 */
export function getXpToNextRank(currentXp: number, currentRank: string): {
  nextRank: string | null;
  xpNeeded: number;
  progress: number;
} {
  const ranks = Object.keys(RANK_THRESHOLDS) as RankTier[];
  const currentIdx = ranks.indexOf(currentRank as RankTier);

  if (currentIdx === ranks.length - 1) {
    return { nextRank: null, xpNeeded: 0, progress: 100 };
  }

  const nextRank = ranks[currentIdx + 1];
  const nextThreshold = RANK_THRESHOLDS[nextRank];
  const currentThreshold = RANK_THRESHOLDS[currentRank as RankTier];
  const xpNeeded = nextThreshold - currentXp;
  const progress = Math.min(
    ((currentXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100,
    100
  );

  return { nextRank, xpNeeded: Math.max(xpNeeded, 0), progress };
}
