import { desc, eq, like, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { products } from '../../db/schema/index.js';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from './products.validators.js';
import type { Env } from '../../config/env.js';

export const productsRepository = {
  async create(env: Env, data: CreateProductInput) {
    const db = getDb(env);
    const now = new Date();
    const [product] = await db.insert(products).values({
      storeId: data.storeId,
      name: data.name,
      description: data.description,
      images: data.images,
      price: String(data.price),
      allowPreOrder: data.allowPreOrder,
      acceptCommission: data.acceptCommission,
      isCustom: data.isCustom,
      inventory: data.inventory,
      tags: data.tags,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
    }).returning();
    return product;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.products.findFirst({
      where: eq(products.id, id),
    });
  },

  async update(env: Env, id: string, data: UpdateProductInput) {
    const db = getDb(env);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.price !== undefined) updateData.price = String(data.price);
    if (data.allowPreOrder !== undefined) updateData.allowPreOrder = data.allowPreOrder;
    if (data.acceptCommission !== undefined) updateData.acceptCommission = data.acceptCommission;
    if (data.isCustom !== undefined) updateData.isCustom = data.isCustom;
    if (data.inventory !== undefined) updateData.inventory = data.inventory;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;
    
    const [product] = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(products)
      .set({ deletedAt: new Date() })
      .where(eq(products.id, id));
  },

  async findAll(env: Env, query: ProductQuery) {
    const db = getDb(env);
    const { page, limit, search, storeId } = query;
    const offset = (page - 1) * limit;

    const where = [];
    if (search) {
      where.push(like(products.name, `%${search}%`));
    }
    if (storeId) {
      where.push(eq(products.storeId, storeId));
    }

    const [data, totalResult] = await Promise.all([
      db.select().from(products)
        .where(and(...where))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(products).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};