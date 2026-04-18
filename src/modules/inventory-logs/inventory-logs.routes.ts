import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { inventoryLogsService } from './inventory-logs.service.js';
import { createInventoryLogSchema } from './inventory-logs.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const inventoryLogsRoutes = new Hono<{ Bindings: Env }>();

inventoryLogsRoutes.post('/', async (c) => {
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
    const data = createInventoryLogSchema.parse({ ...body, storeId });
    const log = await inventoryLogsService.create(c.env, data);
    return successResponse(c, log, 'Inventory log created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create inventory log';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

inventoryLogsRoutes.get('/', async (c) => {
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
  const productId = c.req.query('productId');
  const orderId = c.req.query('orderId');
  const type = c.req.query('type');
  
  const result = await inventoryLogsService.findAll(c.env, { page, limit, storeId, productId, orderId, type });
  return successResponse(c, result);
});

inventoryLogsRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const log = await inventoryLogsService.findById(c.env, id);

  if (!log) {
    return errorResponse(c, 404, 'NotFound', 'Inventory log not found');
  }

  return successResponse(c, log);
});