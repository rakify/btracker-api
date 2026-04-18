import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { requirePermissions, type PermissionName } from '../../middlewares/permissions.middleware.js';
import { walletsService } from './wallets.service.js';
import { walletsRepository } from './wallets.repository.js';
import { getDb } from '../../db/client.js';
import { masterWallets } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import {
  createWalletSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  rechargeMasterWalletSchema,
  addMasterWalletExpenseSchema,
  recordCustomerPaymentToMasterWalletSchema,
  payoutMemberFromMasterWalletSchema,
  memberWalletTransactionsQuerySchema,
  masterWalletTransactionsQuerySchema,
} from './wallets.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const walletsRoutes = new Hono<{ Bindings: Env; Variables: { permissions: string[] } }>();

// Master wallet overview (default tab data)
walletsRoutes.get('/', requirePermissions(['can_view_master_wallet']), async (c) => {
  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const masterWallet = await walletsRepository.getMasterWallet(c.env, storeId);

    return successResponse(c, {
      wallet: masterWallet,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch master wallet data';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

// Member wallets data (loaded when member wallets tab is clicked)
walletsRoutes.get('/members', requirePermissions(['can_view_member_wallets']), async (c) => {
  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');

  try {
    const memberWallets = await walletsRepository.getMemberWalletsWithUserInfo(c.env, storeId, page, limit);
    return successResponse(c, {
      memberWallets,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch member wallets';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

walletsRoutes.get('/master/:storeId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');
  const wallet = await walletsService.getMasterWallet(c.env, storeId);
  return successResponse(c, wallet);
});

walletsRoutes.post('/master/:storeId', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = createWalletSchema.parse(body);
    const wallet = await walletsService.createMasterWallet(c.env, storeId, { ...data, createdBy: auth.userId });
    return successResponse(c, wallet, 'Master wallet created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create master wallet';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.get('/member/:storeId/:memberUserId', requirePermissions(['can_view_member_wallets']), async (c) => {
  const storeId = c.req.param('storeId');
  const memberUserId = c.req.param('memberUserId');
  const wallet = await walletsService.getMemberWallet(c.env, storeId, memberUserId);
  return successResponse(c, wallet);
});

// Get current user's own wallet
walletsRoutes.get('/my-wallet/:storeId', requirePermissions(['can_view_own_wallet']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');
  const wallet = await walletsService.getMemberWallet(c.env, storeId, auth.userId);
  return successResponse(c, wallet);
});

// Get current user's own wallet transactions
walletsRoutes.get('/my-wallet/:storeId/transactions', requirePermissions(['can_view_own_wallet']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '100');

  try {
    const result = await walletsService.getMemberWalletTransactions(c.env, { storeId, memberUserId: auth.userId, page, limit });
    return successResponse(c, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch wallet transactions';
    return errorResponse(c, 500, 'ServerError', message);
  }
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

walletsRoutes.get('/member', requirePermissions(['can_view_member_wallets']), async (c) => {
  const storeId = c.req.query('storeId');
  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const result = await walletsService.findAllMemberWallets(c.env, { page, limit, storeId });
  return successResponse(c, result);
});

// Transaction routes
walletsRoutes.get('/master/:storeId/transactions', requirePermissions(['can_view_master_wallet']), async (c) => {
  const storeId = c.req.param('storeId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    const result = await walletsService.getMasterWalletTransactions(c.env, { storeId, page, limit });
    return successResponse(c, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch master wallet transactions';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

walletsRoutes.get('/member/:storeId/:memberUserId/transactions', requirePermissions(['can_view_member_wallets']), async (c) => {
  const storeId = c.req.param('storeId');
  const memberUserId = c.req.param('memberUserId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '100');

  try {
    const result = await walletsService.getMemberWalletTransactions(c.env, { storeId, memberUserId, page, limit });
    return successResponse(c, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch member wallet transactions';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

// Expense Category routes
walletsRoutes.get('/expense-categories/:storeId', requirePermissions(['can_view_master_wallet', 'can_manage_master_wallet']), async (c) => {
  const storeId = c.req.param('storeId');

  try {
    const categories = await walletsService.getExpenseCategoriesByStoreId(c.env, storeId);
    return successResponse(c, categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expense categories';
    return errorResponse(c, 500, 'ServerError', message);
  }
});

walletsRoutes.post('/expense-categories/:storeId', requirePermissions(['can_manage_expense_categories']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = createExpenseCategorySchema.parse(body);
    const category = await walletsService.createExpenseCategory(c.env, { ...data, createdBy: auth.userId });
    return successResponse(c, category, 'Expense category created successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense category';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.put('/expense-categories/:storeId/:id', requirePermissions(['can_manage_expense_categories']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const id = c.req.param('id');
  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = updateExpenseCategorySchema.parse(body);
    const category = await walletsService.updateExpenseCategory(c.env, id, { ...data, updatedBy: auth.userId });
    return successResponse(c, category, 'Expense category updated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense category';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

// Financial Action routes
walletsRoutes.post('/master/:storeId/recharge', requirePermissions(['can_manage_master_wallet']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = rechargeMasterWalletSchema.parse(body);
    const result = await walletsService.rechargeMasterWallet(c.env, storeId, data.amount, data.note, auth.userId);
    return successResponse(c, result, 'Master wallet recharged successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to recharge master wallet';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.post('/master/:storeId/expense', requirePermissions(['can_manage_master_wallet']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = addMasterWalletExpenseSchema.parse(body);
    const result = await walletsService.addMasterWalletExpense(c.env, storeId, data.expenseCategoryId, data.amount, data.note, auth.userId);
    return successResponse(c, result, 'Expense added successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add expense';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.post('/master/:storeId/payment', requirePermissions(['can_manage_master_wallet']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = recordCustomerPaymentToMasterWalletSchema.parse(body);
    const result = await walletsService.recordCustomerPayment(c.env, storeId, data.customerId, data.amount, data.note, data.orderId, auth.userId);
    return successResponse(c, result, 'Payment recorded successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record payment';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});

walletsRoutes.post('/master/:storeId/payout', requirePermissions(['can_manage_member_wallets']), async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.param('storeId');

  try {
    const body = await c.req.json();
    const data = payoutMemberFromMasterWalletSchema.parse(body);
    const result = await walletsService.payoutMember(c.env, storeId, data.memberUserId, data.amount, data.payoutType, data.note, data.orderId, auth.userId);
    return successResponse(c, result, 'Payout processed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process payout';
    return errorResponse(c, 400, 'ValidationError', message);
  }
});