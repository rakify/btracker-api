import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { adminRoles, userProfiles, stores, users } from '../../db/schema/index.js';
import type { CreateAdminRoleInput, UpdateAdminRoleInput } from './admin.validators.js';
import type { Env } from '../../config/env.js';

export const adminRepository = {
  async findByUserId(env: Env, userId: string) {
    const db = getDb(env);
    const result = await db.select().from(adminRoles).where(eq(adminRoles.userId, userId)).limit(1);

    return result.length > 0 ? result[0] : null;
  },

  async findAll(env: Env) {
    const db = getDb(env);
    return await db.select().from(adminRoles);
  },

  async create(env: Env, data: CreateAdminRoleInput) {
    const db = getDb(env);
    const [role] = await db
      .insert(adminRoles)
      .values({
        id: crypto.randomUUID(),
        ...data,
      })
      .returning();

    return role;
  },

  async update(env: Env, userId: string, data: UpdateAdminRoleInput) {
    const db = getDb(env);
    const [role] = await db
      .update(adminRoles)
      .set(data)
      .where(eq(adminRoles.userId, userId))
      .returning();

    return role;
  },

  async delete(env: Env, userId: string) {
    const db = getDb(env);
    await db.delete(adminRoles).where(eq(adminRoles.userId, userId));
  },

  async isBanned(env: Env, userId: string): Promise<boolean> {
    const db = getDb(env);
    const userProfile = await db
      .select({ isBanned: userProfiles.isBanned })
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return userProfile.length > 0 && userProfile[0].isBanned === true;
  },

  async getAllStoresForAdmin(env: Env) {
    const db = getDb(env);
    return await db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        active: stores.active,
        description: stores.description,
        userId: stores.userId,
        createdAt: stores.createdAt,
        activeSince: stores.activeSince,
      })
      .from(stores)
      .where(isNull(stores.deletedAt))
      .orderBy(stores.createdAt);
  },

  async activateStore(env: Env, storeId: string, adminUserId: string) {
    const db = getDb(env);
    const [store] = await db
      .update(stores)
      .set({
        active: true,
        activeSince: new Date(),
        updatedBy: adminUserId,
      })
      .where(eq(stores.id, storeId))
      .returning();

    return store;
  },

  async deactivateStore(env: Env, storeId: string, adminUserId: string) {
    const db = getDb(env);
    const [store] = await db
      .update(stores)
      .set({
        active: false,
        activeSince: null,
        updatedBy: adminUserId,
      })
      .where(eq(stores.id, storeId))
      .returning();

    return store;
  },

  async getStoreStats(env: Env) {
    const db = getDb(env);
    const allStores = await db
      .select({ active: stores.active })
      .from(stores)
      .where(isNull(stores.deletedAt));

    const totalStores = allStores.length;
    const activeStores = allStores.filter(store => store.active).length;

    return {
      totalStores,
      activeStores,
      inactiveStores: totalStores - activeStores,
    };
  },

  async getAllUsers(env: Env) {
    const db = getDb(env);

    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users);

    const admins = await db.select({ userId: adminRoles.userId, role: adminRoles.role }).from(adminRoles);

    const adminsMap = new Map(admins.map(a => [a.userId, a.role]));

    const result = [];
    for (const user of usersData) {
      const profile = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);

      const adminRole = adminsMap.get(user.id);
      const userProfile = profile[0];

      result.push({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        isAdmin: !!adminRole,
        adminRole,
        adminPermissions: adminRole ? { 'store.activate': true, 'store.deactivate': true, 'admin.manage': true } : null,
        isBanned: userProfile?.isBanned || false,
        bannedAt: userProfile?.bannedAt || null,
        banReason: userProfile?.banReason || null,
        deletedAt: userProfile?.deletedAt || null,
      });
    }

    return result;
  },
};
