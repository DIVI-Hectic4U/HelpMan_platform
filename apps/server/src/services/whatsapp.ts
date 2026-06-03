import axios from 'axios';

const WA_API_BASE = 'https://graph.facebook.com/v21.0';

interface SendMessageOptions {
  to: string;
  body: string;
}

interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

/**
 * Send a text message via WhatsApp Cloud API.
 * Only works within the 24-hour service window (user must have messaged first).
 */
export async function sendWhatsAppMessage({ to, body }: SendMessageOptions): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN');
    return false;
  }

  try {
    const response = await axios.post(
      `${WA_API_BASE}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: true, body },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log(`[WhatsApp] Message sent to ${to}:`, response.data);
    return true;
  } catch (error: any) {
    console.error(`[WhatsApp] Failed to send message to ${to}:`,
      error.response?.data || error.message);
    return false;
  }
}

/**
 * Send a template message (for proactive notifications outside service window).
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = 'en',
  parameters = [],
}: SendTemplateOptions): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('[WhatsApp] Missing credentials');
    return false;
  }

  try {
    const components = parameters.length > 0 ? [{
      type: 'body',
      parameters: parameters.map(text => ({ type: 'text', text })),
    }] : undefined;

    const response = await axios.post(
      `${WA_API_BASE}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log(`[WhatsApp] Template "${templateName}" sent to ${to}:`, response.data);
    return true;
  } catch (error: any) {
    console.error(`[WhatsApp] Template send failed:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Format a daily task response for WhatsApp.
 */
export function formatDailyTaskMessage(
  name: string,
  problems: Array<{ title: string; url: string; difficulty: number; topic: string; xpValue: number; platform: string }>,
  streak: number,
  xp: number,
  rank: string,
  studyTip?: string,
  encouragement?: string,
): string {
  const header = `📚 *Daily Tasks for ${name}*\n`;
  const streakLine = `🔥 Streak: *${streak} days* | ⭐ XP: *${xp}* | 🏅 Rank: *${rank}*\n`;
  const divider = `─────────────────────\n`;

  const problemLines = problems.map((p, i) => {
    const emoji = p.platform === 'leetcode' ? '🟡' : '🔵';
    return `${emoji} *${i + 1}. ${p.title}*\n   📊 ${p.topic} | ⚡ ${p.xpValue} XP\n   🔗 ${p.url}`;
  }).join('\n\n');

  const tip = studyTip ? `\n\n💡 *Tip:* ${studyTip}` : '';
  const enc = encouragement ? `\n\n${encouragement}` : '';
  const footer = `\n\n_Send !done <number> when solved_\n_Send !help for all commands_`;

  return `${header}${streakLine}${divider}\n${problemLines}${tip}${enc}${footer}`;
}
