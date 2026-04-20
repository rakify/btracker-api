import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { requirePermissions } from '../../middlewares/permissions.middleware.js';
import { productsService } from './products.service.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from './products.validators.js';
import { successResponse, errorResponse, paginatedResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const productsRoutes = new Hono<{ Bindings: Env; Variables: { permissions: string[] } }>();

productsRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'ValidationError', 'storeId is required');
  }

  try {
    const queryData = {
      page: parseInt(c.req.query('page') || '1'),
      limit: parseInt(c.req.query('limit') || '20'),
      search: c.req.query('search'),
      storeId,
      name: c.req.query('name'),
      price_range: c.req.query('price_range'),
      acceptCommission: c.req.query('acceptCommission'),
      isCustom: c.req.query('isCustom'),
      sort: c.req.query('sort'),
      status: (c.req.query('status') as 'active' | 'deleted' | 'all') || 'active',
    };
    const query = productQuerySchema.parse(queryData);
    const result = await productsService.findAll(c.env, query);
    return paginatedResponse(c, result.data, query.page, query.limit, result.total);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch products';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

productsRoutes.get('/custom', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'ValidationError', 'storeId is required');
  }

  try {
    const queryData = {
      page: parseInt(c.req.query('page') || '1'),
      limit: parseInt(c.req.query('limit') || '20'),
      storeId,
      isCustom: 'true',
      status: 'active' as const,
    };
    const result = await productsService.findAll(c.env, queryData as any);
    return paginatedResponse(c, result.data, queryData.page, queryData.limit, result.total);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch custom products';
    return errorResponse(c, 500, 'ServerError', message);
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

productsRoutes.post('/', requirePermissions(['can_manage_products']), async (c) => {
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
    const data = createProductSchema.parse({ ...body, storeId });
    const product = await productsService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, product, 'Product created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create product';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

productsRoutes.patch('/:id', requirePermissions(['can_manage_products']), async (c) => {
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

productsRoutes.delete('/:id', requirePermissions(['can_manage_products']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await productsService.delete(c.env, id);
  return successResponse(c, null, 'Product deleted successfully');
});

productsRoutes.delete('/custom/:id', requirePermissions(['can_manage_products']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await productsService.delete(c.env, id);
  return successResponse(c, null, 'Custom product deleted successfully');
});

productsRoutes.post('/custom', requirePermissions(['can_manage_products']), async (c) => {
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
    const data = createProductSchema.parse({ ...body, storeId, isCustom: true });
    const product = await productsService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, product, 'Custom product created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create custom product';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});