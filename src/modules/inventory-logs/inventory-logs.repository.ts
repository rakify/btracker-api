import { desc, eq, and, count, inArray } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { inventoryLogs, products, customers, users } from '../../db/schema/index.js';
import type { CreateInventoryLogInput, InventoryLogQuery } from './inventory-logs.validators.js';
import type { Env } from '../../config/env.js';

export const inventoryLogsRepository = {
  async create(env: Env, data: CreateInventoryLogInput) {
    const db = getDb(env);
    const now = new Date();
    const [log] = await db.insert(inventoryLogs).values({
      id: crypto.randomUUID(),
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

    const [logs, totalResult] = await Promise.all([
      db.select().from(inventoryLogs)
        .where(and(...where))
        .orderBy(desc(inventoryLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(inventoryLogs).where(and(...where)),
    ]);

    const productIds = Array.from(
      new Set(logs.map((l) => l.productId).filter(Boolean) as string[]),
    );
    const customerIds = Array.from(
      new Set(logs.map((l) => l.customerId).filter(Boolean) as string[]),
    );
    const userIds = Array.from(
      new Set(logs.map((l) => l.userId).filter(Boolean) as string[]),
    );

    const [productRows, customerRows, userRows] = await Promise.all([
      productIds.length
        ? db.select({ id: products.id, name: products.name })
            .from(products)
            .where(inArray(products.id, productIds))
        : Promise.resolve([] as { id: string; name: string }[]),
      customerIds.length
        ? db.select({ id: customers.id, name: customers.name })
            .from(customers)
            .where(inArray(customers.id, customerIds))
        : Promise.resolve([] as { id: string; name: string }[]),
      userIds.length
        ? db.select({ id: users.clerkUserId, email: users.email })
            .from(users)
            .where(inArray(users.clerkUserId, userIds))
        : Promise.resolve([] as { id: string; email: string | null }[]),
    ]);

    const productMap = new Map(productRows.map((p) => [p.id, p]));
    const customerMap = new Map(customerRows.map((c) => [c.id, c]));
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const data = logs.map((log) => ({
      ...log,
      product: log.productId ? productMap.get(log.productId) ?? null : null,
      customer: log.customerId ? customerMap.get(log.customerId) ?? null : null,
      user: log.userId
        ? userMap.get(log.userId) ?? { id: log.userId, email: null }
        : null,
    }));

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};