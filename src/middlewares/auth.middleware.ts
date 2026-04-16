import type { Context, Next } from 'hono';
import { createClerkClient, verifyToken } from '@clerk/backend';

export interface AuthBindings {
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

export interface AuthContext {
  userId: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

export async function authMiddleware(c: Context<{ Bindings: AuthBindings }>, next: Next) {
  const authHeader = c.req.header('authorization') || c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return c.json({ success: false, error: 'Unauthorized', message: 'No token provided' }, 401);
  }

  try {
    const { data: sessionToken, errors } = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    if (errors || !sessionToken) {
      throw new Error('Invalid token');
    }

    const payload = sessionToken as { sub: string };
    
    const clerk = createClerkClient({
      secretKey: c.env.CLERK_SECRET_KEY,
      publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    });

    const user = await clerk.users.getUser(payload.sub);

    c.set('auth', {
      userId: payload.sub,
      email: user.emailAddresses[0]?.emailAddress || '',
    });

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ success: false, error: 'Unauthorized', message: 'Invalid token' }, 401);
  }
}

export function getAuth(c: Context): AuthContext | null {
  return c.get('auth') || null;
}