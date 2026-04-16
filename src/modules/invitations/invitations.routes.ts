import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { invitationsService } from './invitations.service.js';
import { createInvitationSchema, updateInvitationSchema } from './invitations.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const invitationsRoutes = new Hono<{ Bindings: Env }>();

invitationsRoutes.post('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createInvitationSchema.parse(body);
    const invitation = await invitationsService.create(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, invitation, 'Invitation created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create invitation';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

invitationsRoutes.get('/', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  
  const result = await invitationsService.findAll(c.env, { page, limit, storeId });
  return successResponse(c, result);
});

invitationsRoutes.get('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const invitation = await invitationsService.findById(c.env, id);

  if (!invitation) {
    return errorResponse(c, 404, 'NotFound', 'Invitation not found');
  }

  return successResponse(c, invitation);
});

invitationsRoutes.patch('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  
  try {
    const body = await c.req.json();
    const data = updateInvitationSchema.parse(body);
    const invitation = await invitationsService.update(c.env, id, { ...data, updatedBy: auth.userId });
    return successResponse(c, invitation, 'Invitation updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update invitation';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

invitationsRoutes.delete('/:id', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  await invitationsService.delete(c.env, id);
  return successResponse(c, null, 'Invitation deleted successfully');
});