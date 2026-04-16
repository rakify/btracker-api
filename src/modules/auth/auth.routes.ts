import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { successResponse, errorResponse } from '../../lib/response.js';

export const authRoutes = new Hono();

authRoutes.get('/me', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  return successResponse(c, {
    userId: auth.userId,
    email: auth.email,
  });
});