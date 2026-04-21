import { Hono } from 'hono';
import { getDb } from '../../db/client.js';
import { desc, eq } from 'drizzle-orm';
import { permissions } from '../../db/schema/index.js';
import { stores } from '../../db/schema/stores.schema.js';
import { roles } from '../../db/schema/roles.schema.js';
import { adminRoles } from '../../db/schema/admin-roles.schema.js';
import { users } from '../../db/schema/index.js';
import { getAuth } from '../../middlewares/auth.middleware.js';
import { adminService } from './admin.service.js';
import { storesService } from '../stores/stores.service.js';
import { errorResponse, successResponse } from '../../lib/response.js';
import type { Env } from '../../config/env.js';

export const adminRoutes = new Hono<{ Bindings: Env }>();

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

  const isAdmin = await adminService.isAdmin(c.env, auth.clerkUserId);
  if (!isAdmin) {
    return errorResponse(c, 403, 'Forbidden', 'Only admins can activate stores');
  }

  const id = c.req.param('id');

  try {
    const store = await storesService.activateStore(c.env, id, auth.userId);
    return successResponse(c, store, 'Store activated successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to activate store';
    return errorResponse(c, 400, 'ActivationError', message);
  }
});

adminRoutes.get('/is-admin', async (c) => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.clerkUserId);
  return successResponse(c, { isAdmin });
});

adminRoutes.post('/sync-users', async (c) => {
  const auth = getAuth(c);
  if (!auth) return errorResponse(c, 401, 'Unauthorized', 'Not authenticated');

  const isAdmin = await adminService.isAdmin(c.env, auth.clerkUserId);
  if (!isAdmin) return errorResponse(c, 403, 'Forbidden', 'Only admins can sync users');

  try {
    const { createClerkClient } = await import('@clerk/backend');
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });

    const db = getDb(c.env);
    let totalSynced = 0;
    let totalFailed = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
      const { data: clerkUsers } = await clerk.users.getUserList({ limit, offset });
      if (clerkUsers.length === 0) break;

      for (const clerkUser of clerkUsers) {
        try {
          const primaryEmail = clerkUser.emailAddresses.find(
            (e: { id: string }) => e.id === clerkUser.primaryEmailAddressId,
          );
          const email = primaryEmail?.emailAddress || null;
          const emailVerified = primaryEmail?.verification?.status === 'verified';
          const name =
            clerkUser.firstName && clerkUser.lastName
              ? `${clerkUser.firstName} ${clerkUser.lastName}`
              : clerkUser.fullName || null;

          await db
            .insert(users)
            .values({
              id: crypto.randomUUID(),
              clerkUserId: clerkUser.id,
              email,
              emailVerified: emailVerified ?? false,
              name,
              avatarUrl: clerkUser.imageUrl || null,
              username: clerkUser.username || null,
              phoneNumber: clerkUser.phoneNumbers?.[0]?.phoneNumber || null,
              signUpMethod:
                clerkUser.externalAccounts?.[0]?.provider || 'email',
              passwordEnabled: clerkUser.passwordEnabled ?? false,
              twoFactorEnabled: clerkUser.twoFactorEnabled ?? false,
              banned: clerkUser.banned ?? false,
              publicMetadata: clerkUser.publicMetadata || {},
              lastSignInAt: clerkUser.lastSignInAt
                ? new Date(clerkUser.lastSignInAt)
                : null,
              createdAt: new Date(clerkUser.createdAt),
              updatedAt: new Date(clerkUser.updatedAt),
            })
            .onConflictDoUpdate({
              target: users.clerkUserId,
              set: {
                email,
                emailVerified: emailVerified ?? false,
                name,
                avatarUrl: clerkUser.imageUrl || null,
                username: clerkUser.username || null,
                phoneNumber: clerkUser.phoneNumbers?.[0]?.phoneNumber || null,
                passwordEnabled: clerkUser.passwordEnabled ?? false,
                twoFactorEnabled: clerkUser.twoFactorEnabled ?? false,
                banned: clerkUser.banned ?? false,
                publicMetadata: clerkUser.publicMetadata || {},
                lastSignInAt: clerkUser.lastSignInAt
                  ? new Date(clerkUser.lastSignInAt)
                  : null,
                updatedAt: new Date(),
              },
            });
          totalSynced++;
        } catch {
          totalFailed++;
        }
      }

      offset += limit;
    }

    return successResponse(c, { synced: totalSynced, failed: totalFailed }, 'Users synced from Clerk');
  } catch (error) {
    console.error('Sync users error:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to sync users from Clerk');
  }
});