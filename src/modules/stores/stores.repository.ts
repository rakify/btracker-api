import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { stores, users } from '../../db/schema/index.js';
import type { CreateStoreInput, UpdateStoreInput, StoreQuery } from './stores.validators.js';
import type { Env } from '../../config/env.js';

export const storesRepository = {
  async create(env: Env, data: CreateStoreInput, userId: string) {
    const db = getDb(env);
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Insert with all values
    const result = await db.insert(stores).values({
      id: crypto.randomUUID(),
      userId: userId,
      name: data.name,
      description: data.description || null,
      slug: slug,
      currencySymbol: '৳',
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
    }).returning();
    
    return result[0];
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.stores.findFirst({
      where: eq(stores.id, id),
    });
  },

  async findBySlug(env: Env, slug: string) {
    const db = getDb(env);
    return db.query.stores.findFirst({
      where: eq(stores.slug, slug),
    });
  },

  async update(env: Env, id: string, data: UpdateStoreInput) {
    const db = getDb(env);
    const [store] = await db.update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return store;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(stores)
      .set({ deletedAt: new Date() })
      .where(eq(stores.id, id));
  },

  async findAll(env: Env, query: StoreQuery) {
    const db = getDb(env);
    const { page, limit, userId } = query;
    const offset = (page - 1) * limit;

    const where = [];
    if (userId) {
      where.push(eq(stores.userId, userId));
    }

    const [data, totalResult] = await Promise.all([
      db.select().from(stores)
        .where(and(...where))
        .orderBy(desc(stores.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(stores).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async findByUser(env: Env, userId: string) {
    const db = getDb(env);
    return db.query.stores.findMany({
      where: eq(stores.userId, userId),
      orderBy: desc(stores.createdAt),
    });
  },

  async countByUser(env: Env, userId: string) {
    const db = getDb(env);
    const [result] = await db.select({ count: count() }).from(stores).where(eq(stores.userId, userId));
    return result?.count || 0;
  },

  async findPending(env: Env) {
    const db = getDb(env);
    return db.query.stores.findMany({
      where: eq(stores.active, false),
      orderBy: desc(stores.createdAt),
    });
  },
};