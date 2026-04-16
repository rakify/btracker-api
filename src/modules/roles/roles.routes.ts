import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { rolesService } from './roles.service.js';
import { createRoleSchema, updateRoleSchema } from './roles.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const rolesRoutes = new Hono<{ Bindings: Env }>();

rolesRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createRoleSchema.parse(body);
    const role = await rolesService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, role, 'Role created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create role';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

rolesRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  
  try {
    if (storeId) {
      const roles = await rolesService.findByStore(c.env, storeId);
      return successResponse(c, roles);
    }
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const result = await rolesService.findAll(c.env, { page, limit });
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch roles');
  }
});

rolesRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const role = await rolesService.findById(c.env, id);

  if (!role) {
    return errorResponse(c, 404, 'NotFound', 'Role not found');
  }

  return successResponse(c, role);
});

rolesRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const data = updateRoleSchema.parse(body);
    const role = await rolesService.update(c.env, id, { ...data, updatedBy: auth.userId });
    return successResponse(c, role, 'Role updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update role';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

rolesRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await rolesService.delete(c.env, id);
  return successResponse(c, null, 'Role deleted successfully');
});