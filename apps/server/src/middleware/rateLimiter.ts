import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@helpman/shared';

/**
 * Rate limiter for webhook endpoints.
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: RATE_LIMITS.WEBHOOK_PER_MIN,
  message: { error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for dashboard API endpoints.
 */
export const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMITS.DASHBOARD_PER_MIN,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for AI-powered endpoints (Gemini).
 */
export const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMITS.GEMINI_PER_MIN,
  message: { error: 'AI request limit reached. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});
