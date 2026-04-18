import { Hono } from 'hono';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import { getDb } from '../../db/client.js';
import { userRoles, rolePermissions, permissions } from '../../db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';
import type { Env } from '../../config/env.js';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.get('/me', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  return successResponse(c, {
    userId: auth.userId,
    email: auth.email,
  });
});

authRoutes.get('/user-roles', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const db = getDb(c.env);
    const userRolesData = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(eq(userRoles.userId, auth.userId));

    return successResponse(c, userRolesData);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch user roles');
  }
});

authRoutes.get('/permissions-by-roles', async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const roleIdsParam = c.req.query('roleIds');
  if (!roleIdsParam) {
    return errorResponse(c, 400, 'BadRequest', 'roleIds is required');
  }

  try {
    const roleIds = roleIdsParam.split(',').map(id => id.trim());
    const db = getDb(c.env);

    const permissionsData = await db
      .select({ permissionName: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    return successResponse(c, permissionsData);
  } catch (error) {
    console.error('Error fetching permissions by roles:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch permissions by roles');
  }
});