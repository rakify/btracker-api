import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { roles } from '../../db/schema/index.js';
import type { CreateRoleInput, UpdateRoleInput, RoleQuery } from './roles.validators.js';
import type { Env } from '../../config/env.js';

export const rolesRepository = {
  async create(env: Env, data: CreateRoleInput) {
    const db = getDb(env);
    const now = new Date();
    const [role] = await db.insert(roles).values({
      name: data.name,
      description: data.description,
      storeId: data.storeId,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return role;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.roles.findFirst({
      where: eq(roles.id, id),
    });
  },

  async update(env: Env, id: string, data: UpdateRoleInput) {
    const db = getDb(env);
    const [role] = await db.update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(roles)
      .set({ deletedAt: new Date() })
      .where(eq(roles.id, id));
  },

  async findAll(env: Env, query: RoleQuery) {
    const db = getDb(env);
    const { page, limit, storeId } = query;
    const offset = (page - 1) * limit;

    const where = [];
    if (storeId) where.push(eq(roles.storeId, storeId));

    const [data, totalResult] = await Promise.all([
      db.select().from(roles)
        .where(and(...where))
        .orderBy(desc(roles.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(roles).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async findByStore(env: Env, storeId: string) {
    const db = getDb(env);
    return db.query.roles.findMany({
      where: eq(roles.storeId, storeId),
      orderBy: desc(roles.createdAt),
    });
  },
};