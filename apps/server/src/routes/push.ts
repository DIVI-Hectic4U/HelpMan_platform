import { Router } from 'express';
import prisma from '../lib/prisma';
import { requireAuth, type AuthRequest } from '../middleware/auth';

export const pushRoutes = Router();

/**
 * Web Push uses the Push API + Service Worker on the frontend.
 * The backend stores push subscriptions and sends notifications via the web-push library.
 * For simplicity, we use a lightweight in-memory + DB approach.
 */

// ── Save Push Subscription ──────────────────────────────────
pushRoutes.post('/subscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    // Store subscription as JSON in user preferences
    await prisma.userPreference.upsert({
      where: { userId: req.userId! },
      update: {
        pushSubscription: JSON.stringify({ endpoint, keys }),
      },
      create: {
        userId: req.userId!,
        pushSubscription: JSON.stringify({ endpoint, keys }),
      },
    });

    return res.json({ message: 'Push subscription saved' });
  } catch (error) {
    console.error('[Push] Subscribe error:', error);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// ── Remove Push Subscription ─────────────────────────────────
pushRoutes.delete('/subscribe', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.userPreference.update({
      where: { userId: req.userId! },
      data: { pushSubscription: null },
    });

    return res.json({ message: 'Push subscription removed' });
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// ── Get VAPID Public Key ─────────────────────────────────────
pushRoutes.get('/vapid-key', (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'VAPID keys not configured' });
  }
  return res.json({ publicKey });
});
