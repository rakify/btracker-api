import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { membersService } from './members.service.js';
import { membersQuerySchema, updateMemberRoleSchema } from './members.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const membersRoutes = new Hono<{ Bindings: Env }>();

membersRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const validated = membersQuerySchema.parse({
    page: parseInt(c.req.query('page') || '1'),
    limit: parseInt(c.req.query('limit') || '20'),
    storeId: c.req.query('storeId'),
  });

  try {
    const result = await membersService.findByStore(c.env, validated);
    return successResponse(c, result);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch members');
  }
});

membersRoutes.get('/:userId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const userId = c.req.param('userId');
  const storeId = c.req.query('storeId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const member = await membersService.findByUserId(c.env, userId, storeId);
    if (!member || member.length === 0) {
      return errorResponse(c, 404, 'NotFound', 'Member not found');
    }
    return successResponse(c, member[0]);
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch member');
  }
});

membersRoutes.patch('/:userId/role', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const userId = c.req.param('userId');
  const storeId = c.req.query('storeId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const body = await c.req.json();
    const data = updateMemberRoleSchema.parse(body);
    const updated = await membersService.updateRole(c.env, userId, storeId, { ...data, updatedBy: auth.userId });
    return successResponse(c, updated, 'Member role updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member role';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

membersRoutes.delete('/:userId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const userId = c.req.param('userId');
  const storeId = c.req.query('storeId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    await membersService.removeMember(c.env, userId, storeId);
    return successResponse(c, null, 'Member removed successfully');
  } catch (error) {
    return errorResponse(c, 500, 'ServerError', 'Failed to remove member');
  }
});