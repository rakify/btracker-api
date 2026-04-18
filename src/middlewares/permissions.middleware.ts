import { getDb } from '../db/client.js';
import { userRoles, rolePermissions, permissions } from '../db/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { MiddlewareHandler, Hono } from 'hono';
import type { Env } from '../config/env.js';

export type PermissionName =
  | 'can_view_master_wallet'
  | 'can_manage_master_wallet'
  | 'can_view_member_wallets'
  | 'can_manage_member_wallets'
  | 'can_manage_expense_categories'
  | 'can_view_own_wallet'
  | 'can_view_orders'
  | 'can_manage_orders'
  | 'can_view_products'
  | 'can_manage_products'
  | 'can_add_custom_products'
  | 'can_view_customers'
  | 'can_manage_customers'
  | 'can_view_roles'
  | 'can_manage_roles'
  | 'can_view_members'
  | 'can_manage_members'
  | 'can_view_invitations'
  | 'can_manage_invitations'
  | 'can_view_activity_logs'
  | 'can_view_inventory_logs'
  | 'can_view_stores'
  | 'can_manage_stores';

export function requirePermissions(requiredPermissions: PermissionName[]): MiddlewareHandler<{ Bindings: Env; Variables: { permissions: string[] } }> {
  return async (c, next) => {
    const auth = c.get('auth');
    if (!auth) {
      return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401);
    }

    const storeId = c.req.param('storeId') || c.req.query('storeId');
    if (!storeId) {
      return c.json({ error: 'BadRequest', message: 'storeId is required' }, 400);
    }

    try {
      const db = getDb(c.env);

      const userRolesData = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, auth.userId),
        eq(userRoles.storeId, storeId)
      ));

      if (userRolesData.length === 0) {
        return c.json({ error: 'Forbidden', message: 'No roles found for this store' }, 403);
      }

      const roleIds = userRolesData.map((ur) => ur.roleId);

      const userPermissions = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

      const uniquePermissions = [...new Set(userPermissions.map((p) => p.name))];

      console.log('DEBUG permissions - roleIds:', roleIds, 'uniquePermissions:', uniquePermissions);

      const hasAllPermissions = requiredPermissions.every(perm => uniquePermissions.includes(perm));

      if (!hasAllPermissions) {
        return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
      }

      c.set('permissions', uniquePermissions);
      await next();
    } catch (error) {
      console.error('Permission check error:', error);
      return c.json({ error: 'ServerError', message: 'Failed to check permissions' }, 500);
    }
  };
}

export function hasAnyPermission(permissionList: string[], requiredPermissions: PermissionName[]): boolean {
  return requiredPermissions.some(perm => permissionList.includes(perm));
}