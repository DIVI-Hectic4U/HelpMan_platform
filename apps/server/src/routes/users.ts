import { Router } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { dashboardLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema, handleSchema, preferencesSchema } from '@helpman/shared';

export const userRoutes = Router();

userRoutes.use(dashboardLimiter);

// ── Register ─────────────────────────────────────────────────
userRoutes.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        preferences: {
          create: {},
        },
      },
      select: { id: true, name: true, email: true, rank: true },
    });

    const token = generateToken(user.id, 'USER');

    return res.status(201).json({ user, token });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Users] Register error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Login ────────────────────────────────────────────────────
userRoutes.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true, name: true, email: true, passwordHash: true,
        role: true, rank: true, currentXp: true, currentStreak: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    const { passwordHash: _, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Users] Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ── Get Profile ──────────────────────────────────────────────
userRoutes.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, rank: true,
        currentXp: true, currentStreak: true, longestStreak: true,
        whatsappLinked: true, leetcodeHandle: true, codeforcesHandle: true,
        role: true, avatarUrl: true, createdAt: true,
        preferences: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (error) {
    console.error('[Users] Profile fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── Update Profile ───────────────────────────────────────────
userRoutes.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, leetcodeHandle, codeforcesHandle } = req.body;

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (leetcodeHandle !== undefined) {
      if (leetcodeHandle) handleSchema.parse(leetcodeHandle);
      updateData.leetcodeHandle = leetcodeHandle || null;
    }
    if (codeforcesHandle !== undefined) {
      if (codeforcesHandle) handleSchema.parse(codeforcesHandle);
      updateData.codeforcesHandle = codeforcesHandle || null;
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true, name: true, email: true, leetcodeHandle: true,
        codeforcesHandle: true,
      },
    });

    return res.json(user);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid handle format', details: error.errors });
    }
    console.error('[Users] Update error:', error);
    return res.status(500).json({ error: 'Update failed' });
  }
});

// ── Update Preferences ───────────────────────────────────────
userRoutes.put('/me/preferences', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = preferencesSchema.parse(req.body);

    const prefs = await prisma.userPreference.upsert({
      where: { userId: req.userId! },
      update: data,
      create: { userId: req.userId!, ...data },
    });

    return res.json(prefs);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[Users] Preferences error:', error);
    return res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ── Delete Account ───────────────────────────────────────────
userRoutes.delete('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.user.delete({ where: { id: req.userId } });
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('[Users] Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

function generateToken(userId: string, role: string): string {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
  return jwt.sign({ sub: userId, role }, secret, { expiresIn: '7d' });
}
