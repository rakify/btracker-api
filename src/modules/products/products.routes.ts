import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { productsService } from './products.service.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.validators.js';
import { successResponse, errorResponse, paginatedResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const productsRoutes = new Hono<{ Bindings: Env }>();

productsRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const query = productQuerySchema.parse(c.req.query());
    const result = await productsService.findAll(c.env, query);
    return paginatedResponse(c, result.data, query.page, query.limit, result.total);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch products');
  }
});

productsRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const product = await productsService.findById(c.env, id);

  if (!product) {
    return errorResponse(c, 404, 'NotFound', 'Product not found');
  }

  return successResponse(c, product);
});

productsRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const data = createProductSchema.parse(await c.req.json());
    const product = await productsService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, product, 'Product created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

productsRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');

  try {
    const data = updateProductSchema.parse(await c.req.json());
    const product = await productsService.update(c.env, id, { ...data, updatedBy: auth.userId });
    return successResponse(c, product, 'Product updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

productsRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await productsService.delete(c.env, id);
  return successResponse(c, null, 'Product deleted successfully');
});