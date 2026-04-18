import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { dashboardService } from './dashboard.service.js';
import { dashboardQuerySchema } from './dashboard.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

dashboardRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const validatedQuery = dashboardQuerySchema.parse({ userId: auth.userId });
    const result = await dashboardService.getDashboardData(c.env, validatedQuery);
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch dashboard data');
  }
});