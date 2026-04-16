import type { Context } from 'hono';
import { successResponse, errorResponse } from '../../lib/response.js';
import { getAuth } from '../../middlewares/auth.middleware.js';

export const authService = {
  async getMe(c: Context) {
    const auth = getAuth(c);
    if (!auth) return errorResponse(c, 401, 'Unauthorized');

    return successResponse(c, {
      userId: auth.userId,
      email: auth.email,
    });
  },
};
