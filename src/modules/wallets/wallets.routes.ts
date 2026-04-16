import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { walletsService } from './wallets.service.js';
import { createWalletSchema } from './wallets.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const walletsRoutes = new Hono<{ Bindings: Env }>();

walletsRoutes.get('/master/:storeId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');
  const wallet = await walletsService.getMasterWallet(c.env, storeId);
  return successResponse(c, wallet);
});

walletsRoutes.post('/master', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const data = createWalletSchema.parse(body);
    const wallet = await walletsService.createMasterWallet(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, wallet, 'Master wallet created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create master wallet';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.get('/member/:storeId/:memberUserId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');
  const memberUserId = c.req.param('memberUserId');
  const wallet = await walletsService.getMemberWallet(c.env, storeId, memberUserId);
  return successResponse(c, wallet);
});

walletsRoutes.post('/member', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const body = await c.req.json();
    const wallet = await walletsService.createMemberWallet(c.env, { ...body, createdBy: auth.userId });
    return successResponse(c, wallet, 'Member wallet created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member wallet';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.get('/member', async (c) => {
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
  const result = await walletsService.findAllMemberWallets(c.env, { page, limit, storeId });
  return successResponse(c, result);
});