import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * JWT authentication middleware for API routes.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret) as { sub: string; role: string };
    req.userId = decoded.sub;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Admin-only middleware.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
