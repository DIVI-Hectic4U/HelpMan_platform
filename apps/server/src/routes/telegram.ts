import { Router } from 'express';
import prisma from '../lib/prisma';
import { webhookLimiter } from '../middleware/rateLimiter';
import { sendTelegramMessage, sendTelegramMessageWithButtons, formatDailyTaskMessage, setTelegramWebhook } from '../services/telegram';
import { generateDailyTasks } from '../services/gemini';
import { getCodeforcesUser, getCodeforcesSubmissions, analyzeWeakTopics } from '../services/codeforces';
import { getLeetCodeUser, getLeetCodeSubmissions } from '../services/leetcode';
import { awardXp, updateStreak, getXpToNextRank } from '../services/xp-engine';
import { XP_VALUES, RANK_EMOJIS, type RankTier } from '@helpman/shared';

export const telegramRoutes = Router();

// ── Set Webhook (admin use) ──────────────────────────────────
telegramRoutes.post('/set-webhook', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const success = await setTelegramWebhook(url);
  return res.json({ success });
});

// ── Webhook Receiver (POST) ──────────────────────────────────
telegramRoutes.post('/webhook', webhookLimiter, async (req, res) => {
  // Always respond 200 immediately
  res.status(200).json({ ok: true });

  try {
    const update = req.body;

    // Handle regular messages
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();
      const telegramId = String(update.message.from.id);
      const fromName = update.message.from.first_name || 'User';

      // Find user by telegram chat ID
      const user = await prisma.user.findFirst({
        where: { telegramChatId: telegramId },
        include: { preferences: true },
      });

      if (!user) {
        // Check if it's a /start command with linking token
        if (text.startsWith('/start')) {
          const token = text.split(' ')[1];
          if (token) {
            await handleLinking(chatId, telegramId, token, fromName);
          } else {
            await sendTelegramMessage({
              chatId,
              text: `👋 Welcome to <b>HelpMan Bot</b>!\n\nTo link your account, go to the dashboard and click "Link Telegram".\n\n🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/link-telegram`,
            });
          }
          return;
        }

        await sendTelegramMessage({
          chatId,
          text: `❌ Your Telegram is not linked to HelpMan.\n\nLink it at:\n🔗 ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/link-telegram`,
        });
        return;
      }

      // Route commands
      const command = text.split(' ')[0].replace('@helpman_bot', '');
      const args = text.split(' ').slice(1);

      switch (command) {
        case '/daily':
          await handleDaily(user, chatId);
          break;
        case '/status':
          await handleStatus(user, chatId);
          break;
        case '/done':
          await handleDone(user, chatId, args);
          break;
        case '/leaderboard':
          await handleLeaderboard(chatId);
          break;
        case '/profile':
          await handleProfile(user, chatId);
          break;
        case '/help':
        case '/start':
          await handleHelp(chatId);
          break;
        default:
          await sendTelegramMessage({
            chatId,
            text: `❓ Unknown command: <code>${text}</code>\n\nSend /help to see all available commands.`,
          });
      }
    }

    // Handle callback queries (from inline buttons)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const chatId = update.callback_query.message.chat.id;
      const telegramId = String(update.callback_query.from.id);

      const user = await prisma.user.findFirst({
        where: { telegramChatId: telegramId },
      });

      if (user && callbackData?.startsWith('done_')) {
        const problemIdx = callbackData.split('_')[1];
        await handleDone(user, chatId, [problemIdx]);
      }
    }
  } catch (error) {
    console.error('[Telegram] Webhook processing error:', error);
  }
});

// ── Linking Handler ──────────────────────────────────────────
async function handleLinking(chatId: number, telegramId: string, token: string, name: string) {
  try {
    // Token format: userId:timestamp:hash
    const [userId] = token.split(':');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await sendTelegramMessage({
        chatId,
        text: '❌ Invalid linking token. Please try again from the dashboard.',
      });
      return;
    }

    // Link the account
    await prisma.user.update({
      where: { id: userId },
      data: {
        telegramChatId: String(chatId),
        telegramLinked: true,
      },
    });

    await sendTelegramMessage({
      chatId,
      text: `✅ <b>Account Linked!</b>\n\nHello <b>${user.name}</b>! Your Telegram is now connected to HelpMan.\n\n🚀 Send /daily to get today's coding tasks!\n📖 Send /help to see all commands.`,
    });
  } catch (error) {
    console.error('[Telegram] Linking error:', error);
    await sendTelegramMessage({
      chatId,
      text: '❌ Linking failed. Please try again.',
    });
  }
}

// ── Command Handlers ─────────────────────────────────────────

async function handleDaily(user: any, chatId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let task = await prisma.dailyTask.findFirst({
    where: { userId: user.id, taskDate: { gte: today } },
  });

  if (!task) {
    await sendTelegramMessage({ chatId, text: '🤖 Generating your personalized tasks...' });

    let cfRating: number | undefined;
    let lcSolved: number | undefined;
    let weakTopics: string[] = [];
    let recentSolved: string[] = [];

    if (user.codeforcesHandle) {
      const cfUser = await getCodeforcesUser(user.codeforcesHandle);
      if (cfUser) cfRating = cfUser.rating;
      const subs = await getCodeforcesSubmissions(user.codeforcesHandle);
      weakTopics = analyzeWeakTopics(subs);
      // Add recently solved CF problems
      const solvedCF = subs.filter(s => s.verdict === 'OK').map(s => s.problem.name);
      recentSolved.push(...solvedCF);
    }

    if (user.leetcodeHandle) {
      const lcUser = await getLeetCodeUser(user.leetcodeHandle);
      if (lcUser) lcSolved = lcUser.totalSolved;
      const lcSubs = await getLeetCodeSubmissions(user.leetcodeHandle);
      const solvedLC = lcSubs.map(s => s.title);
      recentSolved.push(...solvedLC);
    }

    const aiResponse = await generateDailyTasks({
      codeforcesRating: cfRating,
      leetcodeSolved: lcSolved,
      weakTopics,
      recentSolved,
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

    // Send with "Mark Done" buttons
    const buttons = aiResponse.problems.map((p: any, i: number) => ([{
      text: `✅ Done: ${p.title}`,
      callback_data: `done_${i + 1}`,
    }]));

    await sendTelegramMessageWithButtons(chatId, msg, buttons);
  } else {
    const problems = task.problems as any[];
    const msg = formatDailyTaskMessage(
      user.name, problems, user.currentStreak, user.currentXp, user.rank,
    );
    await sendTelegramMessage({ chatId, text: '📌 You already have today\'s tasks:\n\n' + msg });
  }
}

async function handleStatus(user: any, chatId: number) {
  const rankProgress = getXpToNextRank(user.currentXp, user.rank);
  const emoji = RANK_EMOJIS[user.rank as RankTier] || '🏅';
  const progressBar = generateProgressBar(rankProgress.progress);

  const msg = `📊 <b>Your Status</b>\n\n` +
    `${emoji} Rank: <b>${user.rank}</b>\n` +
    `⭐ XP: <b>${user.currentXp}</b>\n` +
    `🔥 Streak: <b>${user.currentStreak} days</b>\n` +
    `🏆 Longest Streak: <b>${user.longestStreak} days</b>\n\n` +
    `📈 Progress to ${rankProgress.nextRank || 'MAX'}:\n` +
    `<code>${progressBar}</code> ${Math.round(rankProgress.progress)}%\n` +
    `${rankProgress.xpNeeded > 0 ? `<b>${rankProgress.xpNeeded} XP</b> needed` : '🎉 MAX RANK!'}`;

  await sendTelegramMessage({ chatId, text: msg });
}

async function handleDone(user: any, chatId: number, args: string[]) {
  const problemNum = parseInt(args[0]);
  if (isNaN(problemNum) || problemNum < 1) {
    await sendTelegramMessage({ chatId, text: '❌ Usage: /done &lt;number&gt;\nExample: /done 1' });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const task = await prisma.dailyTask.findFirst({
    where: { userId: user.id, taskDate: { gte: today }, status: 'PENDING' },
  });

  if (!task) {
    await sendTelegramMessage({ chatId, text: '❌ No pending tasks found. Send /daily to get new tasks.' });
    return;
  }

  const problems = task.problems as any[];
  if (problemNum > problems.length) {
    await sendTelegramMessage({ chatId, text: `❌ Invalid problem number. You have ${problems.length} problems.` });
    return;
  }

  const problem = problems[problemNum - 1];
  const xpResult = await awardXp(user.id, problem.xpValue || XP_VALUES.MEDIUM_SOLVE, 'daily_solve');

  await prisma.dailyTask.update({
    where: { id: task.id },
    data: { status: 'COMPLETED', xpAwarded: xpResult.xpAwarded, completedAt: new Date() },
  });

  let msg = `✅ <b>Problem Completed!</b>\n\n` +
    `📝 ${problem.title}\n` +
    `⭐ +${xpResult.xpAwarded} XP (${xpResult.multiplier.toFixed(1)}x streak bonus)\n` +
    `💰 Total XP: <b>${xpResult.newTotalXp}</b>`;

  if (xpResult.rankUp) {
    msg += `\n\n🎉🎉🎉 <b>RANK UP!</b>\n${RANK_EMOJIS[xpResult.previousRank as RankTier]} ${xpResult.previousRank} → ${RANK_EMOJIS[xpResult.newRank as RankTier]} <b>${xpResult.newRank}</b>`;
  }

  await sendTelegramMessage({ chatId, text: msg });
}

async function handleLeaderboard(chatId: number) {
  const topUsers = await prisma.user.findMany({
    orderBy: { currentXp: 'desc' },
    take: 10,
    select: { name: true, currentXp: true, rank: true },
  });

  const lines = topUsers.map((u, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    return `${medal} ${u.name} — ${u.currentXp} XP (${u.rank})`;
  });

  await sendTelegramMessage({ chatId, text: `🏆 <b>Leaderboard — Top 10</b>\n\n${lines.join('\n')}` });
}

async function handleProfile(user: any, chatId: number) {
  const msg = `👤 <b>Your Profile</b>\n\n` +
    `📛 Name: ${user.name}\n` +
    `📧 Email: ${user.email}\n` +
    `💻 Codeforces: ${user.codeforcesHandle || '<i>Not linked</i>'}\n` +
    `💻 LeetCode: ${user.leetcodeHandle || '<i>Not linked</i>'}\n` +
    `📱 Telegram: Linked ✅`;

  await sendTelegramMessage({ chatId, text: msg });
}

async function handleHelp(chatId: number) {
  const msg = `📖 <b>HelpMan Bot Commands</b>\n\n` +
    `/daily — Get today's practice problems\n` +
    `/status — View your XP, streak, and rank\n` +
    `/done &lt;n&gt; — Mark problem #n as completed\n` +
    `/leaderboard — View top 10 users\n` +
    `/profile — View your linked accounts\n` +
    `/help — Show this help message\n\n` +
    `<i>🔗 Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</i>`;

  await sendTelegramMessage({ chatId, text: msg });
}

function generateProgressBar(progress: number): string {
  const filled = Math.round(progress / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}
