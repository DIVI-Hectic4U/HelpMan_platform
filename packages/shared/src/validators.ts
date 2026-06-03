import { z } from 'zod';

// ── User Registration ────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Handle Validation ────────────────────────────────────────
export const handleSchema = z.string()
  .min(3, 'Handle must be at least 3 characters')
  .max(24, 'Handle must be at most 24 characters')
  .regex(/^\w+$/, 'Handle can only contain letters, numbers, and underscores');

// ── WhatsApp Number ──────────────────────────────────────────
export const whatsappNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format');

// ── AI Response Validation ───────────────────────────────────
export const problemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  difficulty: z.union([z.number(), z.string()]).transform(val => {
    if (typeof val === 'number') return val;
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 1000 : num;
  }),
  topic: z.string(),
  xpValue: z.union([z.number(), z.string()]).transform(val => {
    if (typeof val === 'number') return val;
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 50 : num;
  }),
  platform: z.string().transform(val => {
    return val.toLowerCase().includes('codeforces') ? 'codeforces' : 'leetcode';
  }),
});

export const theoryTaskSchema = z.object({
  title: z.string(),
  topic: z.enum(['CS Fundamentals', 'System Design', 'OOP', 'Networking', 'OS', 'DBMS', 'Other']).catch('Other'),
  description: z.string(),
  url: z.string().url().optional(),
  xpValue: z.number().default(20),
  platform: z.literal('theory').default('theory'),
});

export const aiTaskResponseSchema = z.object({
  problems: z.array(problemSchema).min(1).max(5),
  theoryTasks: z.array(theoryTaskSchema).min(0).max(3).optional(),
  studyTip: z.string().optional(),
  encouragement: z.string().optional(),
});

// ── User Preferences ─────────────────────────────────────────
export const preferencesSchema = z.object({
  timezone: z.string().default('Asia/Kolkata'),
  difficultyPref: z.enum(['easy', 'medium', 'hard', 'adaptive']).default('adaptive'),
  dailyReminderAt: z.string().regex(/^\d{2}:\d{2}$/).default('08:00'),
  notificationsOn: z.boolean().default(true),
});

// ── Types from schemas ───────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Problem = z.infer<typeof problemSchema>;
export type TheoryTask = z.infer<typeof theoryTaskSchema>;
export type AITaskResponse = z.infer<typeof aiTaskResponseSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
