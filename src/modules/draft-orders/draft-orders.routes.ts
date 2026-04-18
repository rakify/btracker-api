import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { draftOrdersService } from './draft-orders.service.js';
import { saveDraftOrderSchema, draftOrderQuerySchema } from './draft-orders.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const draftOrdersRoutes = new Hono<{ Bindings: Env }>();

draftOrdersRoutes.post('/', async (c) => {
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
    const data = saveDraftOrderSchema.parse({ ...body, storeId });
    const result = await draftOrdersService.save(c.env, {
      ...data,
      userId: auth.userId,
    });

    return successResponse(c, {
      draftOrderId: result.draftOrderId,
      status: result.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save draft order';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

draftOrdersRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'ValidationError', 'storeId is required');
  }

  const customerId = c.req.query('customerId');

  try {
    // If customerId is provided, get draft for that specific customer
    if (customerId) {
      const draftOrder = await draftOrdersService.findByCustomerId(
        c.env,
        storeId,
        customerId,
        auth.userId
      );
      return successResponse(c, draftOrder);
    }

    // Otherwise, get all drafts for the store
    const draftOrders = await draftOrdersService.findAllByStore(c.env, storeId);
    return successResponse(c, { data: draftOrders, pageCount: 1 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch draft orders';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

draftOrdersRoutes.delete('/clear', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  const customerId = c.req.query('customerId');

  if (!storeId || !customerId) {
    return errorResponse(c, 400, 'ValidationError', 'storeId and customerId are required');
  }

  try {
    await draftOrdersService.clearByCustomerId(c.env, storeId, customerId, auth.userId);
    return successResponse(c, null, 'Draft order cleared successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear draft order';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

draftOrdersRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');

  try {
    await draftOrdersService.delete(c.env, id);
    return successResponse(c, null, 'Draft order deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete draft order';
    return errorResponse(c, 500, 'ServerError', message);
  }
});