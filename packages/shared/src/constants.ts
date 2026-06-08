// ── Rank Thresholds ──────────────────────────────────────────
export const RANK_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
  MASTER: 15000,
} as const;

export const RANK_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'MASTER'] as const;

export type RankTier = (typeof RANK_ORDER)[number];

// ── XP Values ────────────────────────────────────────────────
export const XP_VALUES = {
  EASY_SOLVE: 25,
  MEDIUM_SOLVE: 50,
  HARD_SOLVE: 100,
  DAILY_LOGIN: 10,
  STREAK_BONUS_BASE: 15,
  FIRST_BLOOD: 200, // first solve of the day on platform
  RANK_UP_BONUS: 150,
} as const;

// ── Streak Multiplier ────────────────────────────────────────
// Formula: min(1 + 0.5 * ln(streak), 2.5)
export function calculateStreakMultiplier(streak: number): number {
  if (streak <= 0) return 1;
  return Math.min(1 + 0.5 * Math.log(streak), 2.5);
}

// ── Rank from XP ─────────────────────────────────────────────
export function getRankFromXp(xp: number): RankTier {
  if (xp >= RANK_THRESHOLDS.MASTER) return 'MASTER';
  if (xp >= RANK_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (xp >= RANK_THRESHOLDS.GOLD) return 'GOLD';
  if (xp >= RANK_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

// ── Rank Display ─────────────────────────────────────────────
export const RANK_COLORS: Record<RankTier, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#c0c0c0',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
  MASTER: '#6c5ce7',
};

export const RANK_EMOJIS: Record<RankTier, string> = {
  BRONZE: '🥉',
  SILVER: '🥈',
  GOLD: '🥇',
  PLATINUM: '💎',
  MASTER: '👑',
};

// ── Telegram Bot Commands ────────────────────────────────────
export const TELEGRAM_COMMANDS = {
  DAILY: '/daily',
  STATUS: '/status',
  DONE: '/done',
  LEADERBOARD: '/leaderboard',
  HELP: '/help',
  PROFILE: '/profile',
  START: '/start',
} as const;

// ── API Rate Limits ──────────────────────────────────────────
export const RATE_LIMITS = {
  WEBHOOK_PER_MIN: 30,
  DASHBOARD_PER_MIN: 100,
  GEMINI_PER_MIN: 50,
  USER_MESSAGES_PER_HOUR: 10,
} as const;

// ── Difficulty Mapping ───────────────────────────────────────
export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  adaptive: 'Adaptive',
};
