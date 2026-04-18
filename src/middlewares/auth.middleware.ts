import type { Context, Next } from 'hono';
import { getDb } from '../db/client.js';
import { users } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export interface AuthBindings {
  CLERK_WEBHOOK_SECRET: string;
  DATABASE_URL: string;
}

export interface AuthContext {
  userId: string;
  clerkUserId: string;
  email?: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

const userCache = new Map<string, { clerkUserId: string; internalId: string; email: string; expires: number }>();
const CACHE_TTL = 3600 * 1000;

export async function authMiddleware(c: Context<{ Bindings: AuthBindings }>, next: Next) {
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return c.json({ success: false, error: 'Unauthorized', message: 'No token provided' }, 401);
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return c.json({ success: false, error: 'Unauthorized', message: 'Invalid token format' }, 401);
    }

    const payload = JSON.parse(atob(parts[1]));
    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      return c.json({ success: false, error: 'Unauthorized', message: 'Invalid token - no sub claim' }, 401);
    }

    const now = Date.now();
    const cached = userCache.get(clerkUserId);
    if (cached && cached.expires > now) {
      c.set('auth', { userId: cached.internalId, clerkUserId: cached.clerkUserId, email: cached.email });
      await next();
      return;
    }

    const db = getDb(c.env);
    const existingUser = await db.query.users.findFirst({ where: eq(users.clerkUserId, clerkUserId) });

    if (existingUser) {
      const userData = { clerkUserId, internalId: existingUser.id, email: existingUser.email || '', expires: now + CACHE_TTL };
      userCache.set(clerkUserId, userData);
      c.set('auth', { userId: existingUser.id, clerkUserId, email: existingUser.email || '' });
    } else {
      return c.json({ success: false, error: 'Unauthorized', message: 'User not found' }, 401);
    }

    await next();
  } catch (error) {
    return c.json({ success: false, error: 'Unauthorized', message: 'Invalid token' }, 401);
  }
}

export function getAuth(c: Context): AuthContext | null {
  return c.get('auth') || null;
}