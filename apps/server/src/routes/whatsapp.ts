import { Router } from 'express';
import prisma from '../lib/prisma';
import { verifyWebhookSignature, handleVerificationChallenge } from '../middleware/webhookVerify';
import { webhookLimiter } from '../middleware/rateLimiter';
import { sendWhatsAppMessage, formatDailyTaskMessage } from '../services/whatsapp';
import { generateDailyTasks } from '../services/gemini';
import { getCodeforcesUser, getCodeforcesSubmissions, analyzeWeakTopics } from '../services/codeforces';
import { getLeetCodeUser } from '../services/leetcode';
import { awardXp, updateStreak, getXpToNextRank } from '../services/xp-engine';
import { WHATSAPP_COMMANDS, XP_VALUES, RANK_EMOJIS, type RankTier } from '@helpman/shared';

export const whatsappRoutes = Router();

// ── Webhook Verification (GET) ───────────────────────────────
whatsappRoutes.get('/webhook', handleVerificationChallenge);

// ── Webhook Message Reception (POST) ─────────────────────────
whatsappRoutes.post('/webhook', webhookLimiter, verifyWebhookSignature, async (req, res) => {
  // Always respond 200 immediately to Meta
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const from = message.from; // Phone number
    const text = message.text.body.trim().toLowerCase();

    // Find user by WhatsApp number
    const user = await prisma.user.findFirst({
      where: { whatsappNumber: from, whatsappLinked: true },
      include: { preferences: true },
    });

    if (!user) {
      await sendWhatsAppMessage({
        to: from,
        body: '❌ Your number is not linked to HelpMan.\n\nVisit our dashboard to link your WhatsApp account:\n🔗 ' + (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/dashboard/link-whatsapp',
      });
      return;
    }

    // Route commands
    const command = text.split(' ')[0];
    const args = text.split(' ').slice(1);

    switch (command) {
      case WHATSAPP_COMMANDS.DAILY:
        await handleDaily(user, from);
        break;
      case WHATSAPP_COMMANDS.STATUS:
        await handleStatus(user, from);
        break;
      case WHATSAPP_COMMANDS.DONE:
        await handleDone(user, from, args);
        break;
      case WHATSAPP_COMMANDS.LEADERBOARD:
        await handleLeaderboard(from);
        break;
      case WHATSAPP_COMMANDS.PROFILE:
        await handleProfile(user, from);
        break;
      case WHATSAPP_COMMANDS.HELP:
        await handleHelp(from);
        break;
      default:
        await sendWhatsAppMessage({
          to: from,
          body: `❓ Unknown command: "${text}"\n\nSend *!help* to see all available commands.`,
        });
    }
  } catch (error) {
    console.error('[WhatsApp] Webhook processing error:', error);
  }
});

// ── Command Handlers ─────────────────────────────────────────

async function handleDaily(user: any, to: string) {
  // Check existing tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let task = await prisma.dailyTask.findFirst({
    where: { userId: user.id, taskDate: { gte: today } },
  });

  if (!task) {
    // Fetch profile data
    let cfRating: number | undefined;
    let lcSolved: number | undefined;
    let weakTopics: string[] = [];

    if (user.codeforcesHandle) {
      const cfUser = await getCodeforcesUser(user.codeforcesHandle);
      if (cfUser) cfRating = cfUser.rating;
      const subs = await getCodeforcesSubmissions(user.codeforcesHandle);
      weakTopics = analyzeWeakTopics(subs);
    }

    if (user.leetcodeHandle) {
      const lcUser = await getLeetCodeUser(user.leetcodeHandle);
      if (lcUser) lcSolved = lcUser.totalSolved;
    }

    const aiResponse = await generateDailyTasks({
      codeforcesRating: cfRating,
      leetcodeSolved: lcSolved,
      weakTopics,
      currentStreak: user.currentStreak,
      rank: user.rank,
      difficultyPref: user.preferences?.difficultyPref || 'adaptive',
    });

    await updateStreak(user.id);
    await awardXp(user.id, XP_VALUES.DAILY_LOGIN, 'daily_login');

    task = await prisma.dailyTask.create({
      data: {
        userId: user.id,
        taskDate: new Date(),
        problems: aiResponse.problems as any,
        status: 'PENDING',
      },
    });

    // Refresh user data
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });

    const msg = formatDailyTaskMessage(
      updatedUser!.name,
      aiResponse.problems,
      updatedUser!.currentStreak,
      updatedUser!.currentXp,
      updatedUser!.rank,
      aiResponse.studyTip,
      aiResponse.encouragement,
    );

    await sendWhatsAppMessage({ to, body: msg });
  } else {
    const problems = task.problems as any[];
    const msg = formatDailyTaskMessage(
      user.name, problems, user.currentStreak, user.currentXp, user.rank,
    );
    await sendWhatsAppMessage({ to, body: '📌 You already have today\'s tasks:\n\n' + msg });
  }
}

async function handleStatus(user: any, to: string) {
  const rankProgress = getXpToNextRank(user.currentXp, user.rank);
  const emoji = RANK_EMOJIS[user.rank as RankTier] || '🏅';
  const progressBar = generateProgressBar(rankProgress.progress);

  const msg = `📊 *Your Status*\n\n` +
    `${emoji} Rank: *${user.rank}*\n` +
    `⭐ XP: *${user.currentXp}*\n` +
    `🔥 Streak: *${user.currentStreak} days*\n` +
    `🏆 Longest Streak: *${user.longestStreak} days*\n\n` +
    `📈 Progress to ${rankProgress.nextRank || 'MAX'}:\n` +
    `${progressBar} ${Math.round(rankProgress.progress)}%\n` +
    `${rankProgress.xpNeeded > 0 ? `*${rankProgress.xpNeeded} XP* needed` : '🎉 MAX RANK!'}`;

  await sendWhatsAppMessage({ to, body: msg });
}

async function handleDone(user: any, to: string, args: string[]) {
  const problemNum = parseInt(args[0]);
  if (isNaN(problemNum) || problemNum < 1) {
    await sendWhatsAppMessage({ to, body: '❌ Usage: *!done <number>*\nExample: !done 1' });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const task = await prisma.dailyTask.findFirst({
    where: { userId: user.id, taskDate: { gte: today }, status: 'PENDING' },
  });

  if (!task) {
    await sendWhatsAppMessage({ to, body: '❌ No pending tasks found. Send *!daily* to get new tasks.' });
    return;
  }

  const problems = task.problems as any[];
  if (problemNum > problems.length) {
    await sendWhatsAppMessage({ to, body: `❌ Invalid problem number. You have ${problems.length} problems.` });
    return;
  }

  const problem = problems[problemNum - 1];
  const xpResult = await awardXp(user.id, problem.xpValue || XP_VALUES.MEDIUM_SOLVE, 'daily_solve');

  await prisma.dailyTask.update({
    where: { id: task.id },
    data: { status: 'COMPLETED', xpAwarded: xpResult.xpAwarded, completedAt: new Date() },
  });

  let msg = `✅ *Problem Completed!*\n\n` +
    `📝 ${problem.title}\n` +
    `⭐ +${xpResult.xpAwarded} XP (${xpResult.multiplier.toFixed(1)}x streak bonus)\n` +
    `💰 Total XP: *${xpResult.newTotalXp}*`;

  if (xpResult.rankUp) {
    msg += `\n\n🎉🎉🎉 *RANK UP!*\n${RANK_EMOJIS[xpResult.previousRank as RankTier]} ${xpResult.previousRank} → ${RANK_EMOJIS[xpResult.newRank as RankTier]} *${xpResult.newRank}*`;
  }

  await sendWhatsAppMessage({ to, body: msg });
}

async function handleLeaderboard(to: string) {
  const topUsers = await prisma.user.findMany({
    orderBy: { currentXp: 'desc' },
    take: 10,
    select: { name: true, currentXp: true, rank: true },
  });

  const lines = topUsers.map((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} ${u.name} — ${u.currentXp} XP (${u.rank})`;
  });

  const msg = `🏆 *Leaderboard — Top 10*\n\n${lines.join('\n')}`;
  await sendWhatsAppMessage({ to, body: msg });
}

async function handleProfile(user: any, to: string) {
  const msg = `👤 *Your Profile*\n\n` +
    `📛 Name: ${user.name}\n` +
    `📧 Email: ${user.email}\n` +
    `💻 Codeforces: ${user.codeforcesHandle || 'Not linked'}\n` +
    `💻 LeetCode: ${user.leetcodeHandle || 'Not linked'}\n` +
    `📱 WhatsApp: Linked ✅`;

  await sendWhatsAppMessage({ to, body: msg });
}

async function handleHelp(to: string) {
  const msg = `📖 *HelpMan Commands*\n\n` +
    `*!daily* — Get today's practice problems\n` +
    `*!status* — View your XP, streak, and rank\n` +
    `*!done <n>* — Mark problem #n as completed\n` +
    `*!leaderboard* — View top 10 users\n` +
    `*!profile* — View your linked accounts\n` +
    `*!help* — Show this help message\n\n` +
    `_🔗 Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}_`;

  await sendWhatsAppMessage({ to, body: msg });
}

function generateProgressBar(progress: number): string {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
