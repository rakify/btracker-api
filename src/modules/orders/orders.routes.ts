import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { ordersService } from './orders.service.js';
import { createOrderSchema, updateOrderSchema } from './orders.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const ordersRoutes = new Hono<{ Bindings: Env }>();

ordersRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createOrderSchema.parse(body);
    const order = await ordersService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, order, 'Order created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

ordersRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const from = c.req.query('from');
    const to = c.req.query('to');
    
    const result = await ordersService.findAll(c.env, { page, limit, storeId, from, to });
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch orders');
  }
});

ordersRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const order = await ordersService.findById(c.env, id);

  if (!order) {
    return errorResponse(c, 404, 'NotFound', 'Order not found');
  }

  return successResponse(c, order);
});

ordersRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const data = updateOrderSchema.parse(body);
    const order = await ordersService.update(c.env, id, { ...data, updatedBy: auth.userId });
    return successResponse(c, order, 'Order updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

ordersRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await ordersService.delete(c.env, id);
  return successResponse(c, null, 'Order deleted successfully');
});