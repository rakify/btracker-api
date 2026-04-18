import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { activityLogsService } from './activity-logs.service.js';
import { createActivityLogSchema } from './activity-logs.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const activityLogsRoutes = new Hono<{ Bindings: Env }>();

activityLogsRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'ValidationError', 'storeId is required');
  }

  try {
    const body = await c.req.json();
    const data = createActivityLogSchema.parse({ ...body, storeId });
    const log = await activityLogsService.create(c.env, data);
    return successResponse(c, log, 'Activity log created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create activity log';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

activityLogsRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const trackableType = c.req.query('trackableType');
  const action = c.req.query('action');
  
  const result = await activityLogsService.findAll(c.env, { page, limit, storeId, trackableType, action });
  return successResponse(c, result);
});

activityLogsRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const log = await activityLogsService.findById(c.env, id);

  if (!log) {
    return errorResponse(c, 404, 'NotFound', 'Activity log not found');
  }

  return successResponse(c, log);
});