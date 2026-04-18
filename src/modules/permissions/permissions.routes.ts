import { Hono } from 'hono';
import { getDb } from '../../db/client.js';
import { userRoles, rolePermissions, permissions } from '../../db/schema/index.js';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { successResponse, errorResponse } from '../../lib/response.js';
import { eq, and, inArray } from 'drizzle-orm';
import type { Env } from '../../config/env.js';

export const permissionsRoutes = new Hono<{ Bindings: Env }>();

permissionsRoutes.get('/', async c => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  const storeId = c.req.query('storeId');

  if (!storeId) {
    return errorResponse(c, 400, 'BadRequest', 'storeId is required');
  }

  try {
    const db = getDb(c.env);

    // Use internal userId from auth context
    const userRolesData = await db
      .select({ roleId: userRoles.roleId })
      .from(userRoles)
      .where(and(eq(userRoles.userId, auth.userId), eq(userRoles.storeId, storeId)));

    if (userRolesData.length === 0) {
      return successResponse(c, { permissions: [] });
    }

    const roleIds = userRolesData.map(ur => ur.roleId);

    const userPermissions = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    const uniquePermissions = [...new Set(userPermissions.map(p => p.name))];

    return successResponse(c, { permissions: uniquePermissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch permissions');
  }
});

permissionsRoutes.get('/all', async c => {
  const auth = getAuth(c);
  if (!auth) {
    return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');
  }

  try {
    const db = getDb(c.env);
    const allPermissions = await db.select().from(permissions);
    return successResponse(c, { permissions: allPermissions });
  } catch (error) {
    console.error('Error fetching all permissions:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to fetch permissions');
  }
});
