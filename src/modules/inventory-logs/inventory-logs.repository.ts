import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { inventoryLogs } from '../../db/schema/index.js';
import type { CreateInventoryLogInput, InventoryLogQuery } from './inventory-logs.validators.js';
import type { Env } from '../../config/env.js';

export const inventoryLogsRepository = {
  async create(env: Env, data: CreateInventoryLogInput) {
    const db = getDb(env);
    const now = new Date();
    const [log] = await db.insert(inventoryLogs).values({
      storeId: data.storeId,
      type: data.type,
      productId: data.productId,
      orderId: data.orderId,
      customerId: data.customerId,
      userId: data.userId,
      quantityChanged: String(data.quantityChanged),
      previousQuantity: String(data.previousQuantity),
      newQuantity: String(data.newQuantity),
      priceAtTransaction: data.priceAtTransaction ? String(data.priceAtTransaction) : null,
      commissionAmount: data.commissionAmount ? String(data.commissionAmount) : null,
      note: data.note,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return log;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.inventoryLogs.findFirst({
      where: eq(inventoryLogs.id, id),
    });
  },

  async findAll(env: Env, query: InventoryLogQuery) {
    const db = getDb(env);
    const { page, limit, storeId, productId, orderId, type } = query;
    const offset = (page - 1) * limit;

    const where = [eq(inventoryLogs.storeId, storeId)];
    if (productId) where.push(eq(inventoryLogs.productId, productId));
    if (orderId) where.push(eq(inventoryLogs.orderId, orderId));
    if (type) where.push(eq(inventoryLogs.type, type));

    const [data, totalResult] = await Promise.all([
      db.select().from(inventoryLogs)
        .where(and(...where))
        .orderBy(desc(inventoryLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(inventoryLogs).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};