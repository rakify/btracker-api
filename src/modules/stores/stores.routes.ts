import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { storesService } from './stores.service.js';
import { createStoreSchema, updateStoreSchema } from './stores.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const storesRoutes = new Hono<{ Bindings: Env }>();

storesRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createStoreSchema.parse(body);
    const store = await storesService.create(c.env, data, auth.userId);
    return successResponse(c, store, 'Store created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create store';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

storesRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const stores = await storesService.findByUser(c.env, auth.userId);
    return successResponse(c, stores);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch stores: ' + String(error));
  }
});

storesRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const store = await storesService.findById(c.env, id);

  if (!store) {
    return errorResponse(c, 404, 'NotFound', 'Store not found');
  }

  return successResponse(c, store);
});

storesRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const data = updateStoreSchema.parse(body);
    const store = await storesService.update(c.env, id, data);
    return successResponse(c, store, 'Store updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update store';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

storesRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await storesService.delete(c.env, id);
  return successResponse(c, null, 'Store deleted successfully');
});