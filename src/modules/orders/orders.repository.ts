import { desc, eq, and, count, gte, lte } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { orders, orderProducts } from '../../db/schema/index.js';
import type { CreateOrderInput, UpdateOrderInput, OrderQuery } from './orders.validators.js';
import type { Env } from '../../config/env.js';

export const ordersRepository = {
  async create(env: Env, data: CreateOrderInput) {
    const db = getDb(env);
    const now = new Date();

    const [order] = await db.insert(orders).values({
      storeId: data.storeId,
      customerId: data.customerId,
      entryNo: Math.floor(Math.random() * 100000),
      primaryCost: '0',
      totalCostWithCommission: '0',
      totalCostWithoutCommission: '0',
      costAfterCommission: '0',
      commissionPercentage: '0',
      commissionValue: '0',
      previousReserve: '0',
      currentReserve: '0',
      finalReserve: '0',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    let totalCost = 0;
    for (const product of data.products) {
      const qty = typeof product.quantity === 'string' ? parseFloat(product.quantity) : product.quantity;
      const prc = typeof product.price === 'string' ? parseFloat(product.price) : product.price;
      totalCost += qty * prc;

      await db.insert(orderProducts).values({
        storeId: data.storeId,
        orderId: order.id,
        productId: product.productId || null,
        name: product.name,
        price: String(product.price),
        quantity: String(product.quantity),
        returnedQuantity: String(product.returnedQuantity || 0),
        acceptCommission: product.acceptCommission,
        allowPreOrder: product.allowPreOrder,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
      });
    }

    const [updatedOrder] = await db.update(orders)
      .set({ 
        primaryCost: String(totalCost),
        totalCostWithCommission: String(totalCost),
        totalCostWithoutCommission: String(totalCost),
        costAfterCommission: String(totalCost),
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning();

    return { ...order, ...updatedOrder };
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    
    if (order) {
      const orderItems = await db.select().from(orderProducts).where(eq(orderProducts.orderId, id));
      return { ...order, items: orderItems };
    }
    return order;
  },

  async update(env: Env, id: string, data: UpdateOrderInput) {
    const db = getDb(env);
    const [order] = await db.update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(orders)
      .set({ deletedAt: new Date() })
      .where(eq(orders.id, id));
  },

  async findAll(env: Env, query: OrderQuery) {
    const db = getDb(env);
    const { page, limit, storeId, from, to } = query;
    const offset = (page - 1) * limit;

    const where = [eq(orders.storeId, storeId)];
    if (from) where.push(gte(orders.createdAt, new Date(from)));
    if (to) where.push(lte(orders.createdAt, new Date(to)));

    const [data, totalResult] = await Promise.all([
      db.select().from(orders)
        .where(and(...where))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(orders).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};