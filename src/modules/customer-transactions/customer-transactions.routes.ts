import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { customerTransactionsService } from './customer-transactions.service.js';
import { customerTransactionsQuerySchema } from './customer-transactions.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const customerTransactionsRoutes = new Hono<{ Bindings: Env }>();

customerTransactionsRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  const customerId = c.req.query('customerId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  if (!customerId) {
    return errorResponse(c, 400, 'BadRequest', 'customerId is required');
  }

  try {
    const validatedQuery = customerTransactionsQuerySchema.parse({ storeId, customerId });
    const result = await customerTransactionsService.findByCustomerId(c.env, validatedQuery);
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch customer transactions');
  }
});