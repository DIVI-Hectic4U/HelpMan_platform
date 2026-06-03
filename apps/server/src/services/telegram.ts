import axios from 'axios';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface SendMessageOptions {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disableWebPreview?: boolean;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Send a text message via Telegram Bot API.
 */
export async function sendTelegramMessage({
  chatId,
  text,
  parseMode = 'HTML',
  disableWebPreview = false,
}: SendMessageOptions): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('[Telegram] Missing TELEGRAM_BOT_TOKEN');
    return false;
  }

  try {
    const response = await axios.post(`${TELEGRAM_API}${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPreview,
    }, {
      timeout: 10000,
    });

    console.log(`[Telegram] Message sent to ${chatId}:`, response.data.ok);
    return true;
  } catch (error: any) {
    console.error(`[Telegram] Failed to send to ${chatId}:`,
      error.response?.data || error.message);
    return false;
  }
}

/**
 * Send a message with inline keyboard buttons.
 */
export async function sendTelegramMessageWithButtons(
  chatId: string | number,
  text: string,
  buttons: Array<{ text: string; url?: string; callback_data?: string }[]>,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    await axios.post(`${TELEGRAM_API}${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: buttons,
      },
    }, { timeout: 10000 });

    return true;
  } catch (error: any) {
    console.error(`[Telegram] Button message failed:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Set the webhook URL for receiving updates.
 * Call this once during setup.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;

  try {
    const response = await axios.post(`${TELEGRAM_API}${token}/setWebhook`, {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
    });

    console.log('[Telegram] Webhook set:', response.data);
    return response.data.ok;
  } catch (error: any) {
    console.error('[Telegram] Failed to set webhook:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get bot info (for verification).
 */
export async function getTelegramBotInfo(): Promise<TelegramUser | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const response = await axios.get(`${TELEGRAM_API}${token}/getMe`);
    return response.data.ok ? response.data.result : null;
  } catch {
    return null;
  }
}

/**
 * Format daily task message for Telegram (HTML).
 */
export function formatDailyTaskMessage(
  name: string,
  problems: Array<{ title: string; url?: string; difficulty?: number; topic: string; xpValue: number; platform: string; description?: string }>,
  streak: number,
  xp: number,
  rank: string,
  studyTip?: string,
  encouragement?: string,
): string {
  const header = `📚 <b>Daily Tasks for ${escapeHtml(name)}</b>\n`;
  const streakLine = `🔥 Streak: <b>${streak} days</b> | ⭐ XP: <b>${xp}</b> | 🏅 Rank: <b>${rank}</b>\n`;
  const divider = `─────────────────────\n`;

  const problemLines = problems.map((p, i) => {
    if (p.platform === 'theory') {
      const urlText = p.url ? `\n   🔗 <a href="${p.url}">Read more</a>` : '';
      return `📖 <b>${i + 1}. ${escapeHtml(p.title)}</b>\n   📚 ${escapeHtml(p.topic)} | ⚡ ${p.xpValue} XP\n   📝 <i>${escapeHtml(p.description || '')}</i>${urlText}`;
    } else {
      const emoji = p.platform === 'leetcode' ? '🟡' : '🔵';
      return `${emoji} <b>${i + 1}. ${escapeHtml(p.title)}</b>\n   📊 ${escapeHtml(p.topic)} | ⚡ ${p.xpValue} XP\n   🔗 <a href="${p.url}">Solve on ${p.platform}</a>`;
    }
  }).join('\n\n');

  const tip = studyTip ? `\n\n💡 <b>Tip:</b> ${escapeHtml(studyTip)}` : '';
  const enc = encouragement ? `\n\n${escapeHtml(encouragement)}` : '';
  const footer = `\n\n<i>Send /done &lt;number&gt; when solved</i>\n<i>Send /help for all commands</i>`;

  return `${header}${streakLine}${divider}\n${problemLines}${tip}${enc}${footer}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
