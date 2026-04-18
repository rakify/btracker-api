import { Hono } from 'hono';
import { getDb } from '../../db/client.js';
import { desc, eq } from 'drizzle-orm';
import { permissions } from '../../db/schema/index.js';
import { stores } from '../../db/schema/stores.schema.js';
import { roles } from '../../db/schema/roles.schema.js';
import { adminRoles } from '../../db/schema/admin-roles.schema.js';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { adminService } from './admin.service.js';
import { storesService } from '../stores/stores.service.js';
import { errorResponse, successResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const adminRoutes = new Hono<{ Bindings: Env }>();

interface SetupProgress {
  permissionsSeeded: boolean;
  permissionsCount: number;
  storesExist: boolean;
  storesCount: number;
  defaultRolesCreated: boolean;
  hasSuperAdmin: boolean;
  superAdminCount: number;
  allComplete: boolean;
}

adminRoutes.get('/setup-progress', async (c) => {
  const db = getDb(c.env);

  const permissionsList = await db.select().from(permissions);
  const storesList = await db.select().from(stores);
  const rolesList = await db.select().from(roles);
  const admins = await db.select().from(adminRoles);

  const progress: SetupProgress = {
    permissionsSeeded: permissionsList.length > 0,
    permissionsCount: permissionsList.length,
    storesExist: storesList.length > 0,
    storesCount: storesList.length,
    defaultRolesCreated: rolesList.length > 0,
    hasSuperAdmin: admins.length > 0,
    superAdminCount: admins.length,
    allComplete: permissionsList.length > 0 && storesList.length > 0 && rolesList.length > 0 && admins.length > 0,
  };

  return successResponse(c, progress);
});

adminRoutes.get('/stores/stats', async (c) => {
  const db = getDb(c.env);

  const allStores = await db.select().from(stores);
  const activeStores = allStores.filter((s) => s.active);
  const inactiveStores = allStores.filter((s) => !s.active);

  return successResponse(c, {
    stats: {
      totalStores: allStores.length,
      activeStores: activeStores.length,
      inactiveStores: inactiveStores.length,
    },
  });
});

adminRoutes.post('/seed-permissions', async (c) => {
  const db = getDb(c.env);

  const allPermissions = [
    { name: 'can_view_orders', description: 'View orders', group: 'Orders' },
    { name: 'can_manage_orders', description: 'Manage orders', group: 'Orders' },
    { name: 'can_view_products', description: 'View products', group: 'Products' },
    { name: 'can_manage_products', description: 'Manage products', group: 'Products' },
    { name: 'can_add_custom_products', description: 'Add custom products', group: 'Products' },
    { name: 'can_view_customers', description: 'View customers', group: 'Customers' },
    { name: 'can_manage_customers', description: 'Manage customers', group: 'Customers' },
    { name: 'can_view_roles', description: 'View roles', group: 'Roles' },
    { name: 'can_manage_roles', description: 'Manage roles', group: 'Roles' },
    { name: 'can_view_members', description: 'View members', group: 'Members' },
    { name: 'can_manage_members', description: 'Manage members', group: 'Members' },
    { name: 'can_view_invitations', description: 'View invitations', group: 'Invitations' },
    { name: 'can_manage_invitations', description: 'Manage invitations', group: 'Invitations' },
    { name: 'can_view_master_wallet', description: 'View master wallet', group: 'Wallets' },
    { name: 'can_manage_master_wallet', description: 'Manage master wallet', group: 'Wallets' },
    { name: 'can_view_member_wallets', description: 'View member wallets', group: 'Wallets' },
    { name: 'can_manage_member_wallets', description: 'Manage member wallets', group: 'Wallets' },
    { name: 'can_manage_expense_categories', description: 'Manage expense categories', group: 'Wallets' },
    { name: 'can_view_own_wallet', description: 'View own wallet', group: 'Wallets' },
    { name: 'can_view_activity_logs', description: 'View activity logs', group: 'Logs' },
    { name: 'can_view_inventory_logs', description: 'View inventory logs', group: 'Logs' },
    { name: 'can_view_stores', description: 'View stores', group: 'Stores' },
    { name: 'can_manage_stores', description: 'Manage stores', group: 'Stores' },
  ];

  let insertedCount = 0;
  for (const perm of allPermissions) {
    try {
      await db.insert(permissions).values({
        id: crypto.randomUUID(),
        ...perm,
      }).onConflictDoNothing();
      insertedCount++;
    } catch {
      // Skip duplicates
    }
  }

  return successResponse(c, { inserted: insertedCount, total: allPermissions.length });
});

adminRoutes.post('/setup', async (c) => {
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

adminRoutes.get('/stores/pending', async (c) => {
  const db = getDb(c.env);
  const pendingStores = await db.query.stores.findMany({
    where: eq(stores.active, false),
    orderBy: desc(stores.createdAt),
  });
  return successResponse(c, pendingStores);
});

adminRoutes.post('/stores/:id/activate', async (c) => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const id = c.req.param('id');

  try {
    const store = await storesService.activateStore(c.env, id, auth.userId);
    return successResponse(c, store, 'Store activated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate store';
    return errorResponse(c, 400, 'ActivationError', message);
  }
});