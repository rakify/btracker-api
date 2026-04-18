import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { adminService } from './admin.service.js';
import { storeActionSchema } from './admin.validators.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// Check if user is super admin
adminRoutes.get('/is-super-admin', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isSuperAdmin = await adminService.isSuperAdmin(c.env, auth.userId);
  return successResponse(c, { isSuperAdmin });
});

// Get user admin role
adminRoutes.get('/role', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const role = await adminService.getUserAdminRole(c.env, auth.userId);
  return successResponse(c, { role });
});

// Check if user has specific permission
adminRoutes.get('/permission/:permission', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const permission = c.req.param('permission');
  const hasPermission = await adminService.hasAdminPermission(c.env, auth.userId, permission);
  return successResponse(c, { hasPermission });
});

// Check if user is admin
adminRoutes.get('/is-admin', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  return successResponse(c, { isAdmin });
});

// Check if user is banned
adminRoutes.get('/is-banned/:userId', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can check ban status');

  const userId = c.req.param('userId');
  const isBanned = await adminService.isBanned(c.env, userId);
  return successResponse(c, { isBanned });
});

// Get all admins
adminRoutes.get('/admins', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can view admin list');

  const admins = await adminService.getAllAdmins(c.env);
  return successResponse(c, { admins });
});

// Get all users
adminRoutes.get('/users', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can view users');

  const users = await adminService.getAllUsers(c.env);
  return successResponse(c, { users });
});

// Get all stores for admin
adminRoutes.get('/stores', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can view stores');

  const stores = await adminService.getAllStoresForAdmin(c.env);
  return successResponse(c, { stores });
});

// Activate store
adminRoutes.post('/stores/activate', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const body = await c.req.json();
  const data = storeActionSchema.parse(body);
  const success = await adminService.activateStore(c.env, data, auth.userId);
  return successResponse(c, { success }, 'Store activated successfully');
});

// Deactivate store
adminRoutes.post('/stores/deactivate', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const body = await c.req.json();
  const data = storeActionSchema.parse(body);
  const success = await adminService.deactivateStore(c.env, data, auth.userId);
  return successResponse(c, { success }, 'Store deactivated successfully');
});

// Get store stats
adminRoutes.get('/stores/stats', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.userId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can view store stats');

  const stats = await adminService.getStoreStats(c.env);
  return successResponse(c, { stats });
});

// Get setup status - GET
adminRoutes.get('/setup', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const existingAdmins = await adminService.getAllAdmins(c.env);
  const hasAdmins = existingAdmins.length > 0;

  return successResponse(c, {
    hasAdmins,
    adminCount: existingAdmins.length,
    initialAdminEmail: c.env.INITIAL_SUPER_ADMIN_EMAIL,
    setupRequired: !hasAdmins,
  });
});

// Create super admin - POST
adminRoutes.post('/setup', async c => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const body = await c.req.json();
  if (body.secretKey !== c.env.INITIAL_SUPER_ADMIN_EMAIL) {
    return errorResponse(c, 403, 'Forbidden', 'Invalid secret key');
  }

  await adminService.createAdminRole(c.env, {
    userId: auth.userId,
    role: 'super_admin',
    permissions: { 'store.activate': true, 'store.deactivate': true, 'admin.manage': true },
  });

  return successResponse(c, { hasAdmins: true, adminCount: 1, becameSuperAdmin: true }, 'Super admin assigned successfully');
});
