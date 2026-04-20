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
    const { store, isFirstStore } = await storesService.create(c.env, data, auth.userId);
    const message = isFirstStore
      ? 'Store created and activated successfully.'
      : 'Store created successfully. Pending activation by admin.';
    return successResponse(c, store, message);
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

storesRoutes.get('/pending', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const pendingStores = await storesService.findPending(c.env);
    return successResponse(c, pendingStores);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch pending stores: ' + String(error));
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

storesRoutes.post('/:id/activate', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');

  try {
    const store = await storesService.activateStore(c.env, id, auth.userId);
    return successResponse(c, store, 'Store activated successfully. Default roles created.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate store';
    return errorResponse(c, 400, 'ActivationError', message);
  }
});

storesRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');

  // Authorization: only store owner can delete
  const ownerId = await storesService.getOwnerId(c.env, id);
  if (!ownerId) {
    return errorResponse(c, 404, 'NotFound', 'Store not found');
  }
  if (ownerId !== auth.userId) {
    return errorResponse(c, 403, 'Forbidden', 'Only the store owner can delete the store');
  }

  try {
    await storesService.delete(c.env, id, auth.userId);
    return successResponse(c, null, 'Store deleted successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete store';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});