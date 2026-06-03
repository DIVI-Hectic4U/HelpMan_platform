import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

/**
 * Verify WhatsApp webhook signature (HMAC-SHA256).
 * This is MANDATORY per Meta's API documentation.
 */
export function verifyWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-hub-signature-256'] as string;

  if (!signature) {
    console.warn('[Webhook] Missing X-Hub-Signature-256 header');
    res.status(401).json({ error: 'Missing signature' });
    return;
  }

  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error('[Webhook] WHATSAPP_APP_SECRET not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('[Webhook] Invalid signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  next();
}

/**
 * Handle webhook verification challenge from Meta.
 */
export function handleVerificationChallenge(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Verification successful');
    res.status(200).send(challenge);
  } else {
    console.warn('[Webhook] Verification failed — invalid token');
    res.status(403).send('Forbidden');
  }
}
