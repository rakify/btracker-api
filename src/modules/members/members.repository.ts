import { desc, eq, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { userRoles, roles, users } from '../../db/schema/index.js';
import type { MembersQuery, UpdateMemberRoleInput } from './members.validators.js';
import type { Env } from '../../config/env.js';

export const membersRepository = {
  async findByStore(env: Env, query: MembersQuery) {
    const db = getDb(env);
    const { page, limit, storeId } = query;
    const offset = (page - 1) * limit;

    const membersData = await db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        storeId: userRoles.storeId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.avatarUrl,
        roleName: roles.name,
      })
      .from(userRoles)
      .leftJoin(users, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.storeId, storeId))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(userRoles)
      .where(eq(userRoles.storeId, storeId));

    return {
      data: membersData,
      total: total || 0,
    };
  },

  async findByUserId(env: Env, userId: string, storeId: string) {
    const db = getDb(env);
    return db
      .select({
        userId: userRoles.userId,
        roleId: userRoles.roleId,
        storeId: userRoles.storeId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.avatarUrl,
        roleName: roles.name,
      })
      .from(userRoles)
      .leftJoin(users, eq(userRoles.userId, users.id))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
      .limit(1);
  },

  async updateRole(env: Env, userId: string, storeId: string, data: UpdateMemberRoleInput) {
    const db = getDb(env);
    const [updated] = await db
      .update(userRoles)
      .set({ roleId: data.roleId })
      .where(eq(userRoles.userId, userId))
      .returning();
    return updated;
  },

  async removeMember(env: Env, userId: string, storeId: string) {
    const db = getDb(env);
    await db
      .delete(userRoles)
      .where(eq(userRoles.userId, userId));
  },
};