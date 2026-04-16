import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { customersService } from './customers.service.js';
import { createCustomerSchema, updateCustomerSchema } from './customers.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const customersRoutes = new Hono<{ Bindings: Env }>();

customersRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createCustomerSchema.parse(body);
    const customer = await customersService.create(c.env, data);
    return successResponse(c, customer, 'Customer created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create customer';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

customersRoutes.get('/', async (c) => {
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
    const search = c.req.query('search');
    
    const result = await customersService.findAll(c.env, { page, limit, storeId, search });
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch customers');
  }
});

customersRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const customer = await customersService.findById(c.env, id);

  if (!customer) {
    return errorResponse(c, 404, 'NotFound', 'Customer not found');
  }

  return successResponse(c, customer);
});

customersRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const data = updateCustomerSchema.parse(body);
    const customer = await customersService.update(c.env, id, data);
    return successResponse(c, customer, 'Customer updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update customer';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

customersRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await customersService.delete(c.env, id);
  return successResponse(c, null, 'Customer deleted successfully');
});