import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { customersService } from './customers.service.js';
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema, customerOrdersQuerySchema } from './customers.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const customersRoutes = new Hono<{ Bindings: Env }>();

customersRoutes.post('/', async (c) => {
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
    const data = createCustomerSchema.parse({ ...body, storeId });
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
    const queryData = {
      page: parseInt(c.req.query('page') || '1'),
      limit: parseInt(c.req.query('limit') || '10'),
      storeId,
      search: c.req.query('search'),
      status: (c.req.query('status') as 'active' | 'deleted' | 'all') || 'active',
      from: c.req.query('from'),
      to: c.req.query('to'),
      sort: c.req.query('sort'),
    };

    const validatedQuery = customerQuerySchema.parse(queryData);
    const result = await customersService.findAll(c.env, validatedQuery);
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
  const storeId = c.req.query('storeId');
  const status = c.req.query('status') as 'active' | 'deleted' | 'all';

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  const customer = await customersService.findByIdWithStatus(c.env, id, storeId, status);

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

customersRoutes.get('/:id/orders', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const customerId = c.req.param('id');
  const storeId = c.req.query('storeId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const queryData = {
      page: parseInt(c.req.query('page') || '1'),
      per_page: parseInt(c.req.query('per_page') || '10'),
      storeId,
      customerId,
      from: c.req.query('from'),
      to: c.req.query('to'),
      sort: c.req.query('sort'),
      createdBy: c.req.query('createdBy'),
    };

    const validatedQuery = customerOrdersQuerySchema.parse(queryData);
    const result = await customersService.findCustomerOrders(c.env, validatedQuery);
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch customer orders');
  }
});