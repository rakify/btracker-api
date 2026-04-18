import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { draftOrders, draftOrderProducts } from '../../db/schema/index.js';
import type { Env } from '../../config/env.js';

export const draftOrdersRepository = {
  async findByCustomerId(env: Env, storeId: string, customerId: string, userId: string) {
    const db = getDb(env);
    const result = await db
      .select()
      .from(draftOrders)
      .where(
        and(
          eq(draftOrders.storeId, storeId),
          eq(draftOrders.customerId, customerId),
          eq(draftOrders.createdBy, userId),
          isNull(draftOrders.deletedAt)
        )
      )
      .limit(1);

    return result[0] || null;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    const result = await db
      .select()
      .from(draftOrders)
      .where(and(eq(draftOrders.id, id), isNull(draftOrders.deletedAt)))
      .limit(1);

    return result[0] || null;
  },

  async create(env: Env, data: typeof draftOrders.$inferInsert) {
    const db = getDb(env);
    const result = await db
      .insert(draftOrders)
      .values(data)
      .returning();

    return result[0];
  },

  async update(env: Env, id: string, data: Partial<typeof draftOrders.$inferInsert>) {
    const db = getDb(env);
    const result = await db
      .update(draftOrders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(draftOrders.id, id), isNull(draftOrders.deletedAt)))
      .returning();

    return result[0] || null;
  },

  async delete(env: Env, id: string, deletedBy?: string) {
    const db = getDb(env);
    const result = await db
      .update(draftOrders)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(draftOrders.id, id), isNull(draftOrders.deletedAt)))
      .returning();

    return result.length > 0;
  },

  async upsertWithProducts(
    env: Env,
    storeId: string,
    customerId: string,
    userId: string,
    products: Record<string, { quantity: string }>
  ) {
    const db = getDb(env);
    const existingDraft = await this.findByCustomerId(env, storeId, customerId, userId);
    const now = new Date();

    const productEntries = Object.entries(products);
    if (productEntries.length === 0) {
      if (existingDraft) {
        await this.deleteProducts(env, existingDraft.id);
        await this.delete(env, existingDraft.id, userId);
      }
      return { draftOrder: existingDraft, isNew: false, isIdentical: true };
    }

    const newProductIds = new Set(productEntries.map(([id]) => id));
    const existingProducts = existingDraft ? await this.getProducts(env, existingDraft.id) : [];
    const existingProductMap = new Map(existingProducts.map(p => [p.productId, p]));

    const isIdentical = existingDraft !== null &&
      newProductIds.size === existingProductMap.size &&
      Array.from(newProductIds).every(id => existingProductMap.has(id));

    if (existingDraft && isIdentical) {
      return { draftOrder: existingDraft, isNew: false, isIdentical: true };
    }

    if (existingDraft) {
      await this.deleteProducts(env, existingDraft.id);
      await this.delete(env, existingDraft.id, userId);
    }

    const draftOrderId = crypto.randomUUID();
    const newDraftOrder = await this.create(env, {
      id: draftOrderId,
      storeId,
      customerId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    });

    const newProducts = productEntries.map(([productId, { quantity }]) => ({
      id: crypto.randomUUID(),
      storeId,
      draftOrderId,
      productId,
      quantity,
      createdAt: now,
      updatedAt: now,
    }));

    if (newProducts.length > 0) {
      await db.insert(draftOrderProducts).values(newProducts);
    }

    return { draftOrder: newDraftOrder, isNew: true, isIdentical: false };
  },

  async getProducts(env: Env, draftOrderId: string) {
    const db = getDb(env);
    return db
      .select()
      .from(draftOrderProducts)
      .where(and(eq(draftOrderProducts.draftOrderId, draftOrderId), isNull(draftOrderProducts.deletedAt)));
  },

  async deleteProducts(env: Env, draftOrderId: string) {
    const db = getDb(env);
    await db
      .update(draftOrderProducts)
      .set({ deletedAt: new Date() })
      .where(and(eq(draftOrderProducts.draftOrderId, draftOrderId), isNull(draftOrderProducts.deletedAt)));
  },

  async deleteByCustomerId(env: Env, storeId: string, customerId: string, userId: string) {
    const existingDraft = await this.findByCustomerId(env, storeId, customerId, userId);
    if (!existingDraft) return false;

    await this.deleteProducts(env, existingDraft.id);
    await this.delete(env, existingDraft.id, userId);
    return true;
  },

  async findAllByStore(env: Env, storeId: string) {
    const db = getDb(env);
    const result = await db
      .select()
      .from(draftOrders)
      .where(and(eq(draftOrders.storeId, storeId), isNull(draftOrders.deletedAt)));

    const draftsWithProducts = await Promise.all(
      result.map(async (draft) => {
        const products = await this.getProducts(env, draft.id);
        return {
          ...draft,
          products: products.map(p => ({
            id: p.id,
            draftOrderId: p.draftOrderId,
            productId: p.productId,
            quantity: parseFloat(p.quantity) || 0,
            price: p.quantity,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          })),
        };
      })
    );

    return draftsWithProducts;
  },
};