import { desc, eq, and, count, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { orders, orderProducts, customers, products, inventoryLogs, users } from '../../db/schema/index.js';
import type { CreateOrderInput, UpdateOrderInput, OrderQuery } from './orders.validators.js';
import type { Env } from '../../config/env.js';

export const ordersRepository = {
  async create(env: Env, data: CreateOrderInput) {
    const db = getDb(env);
    const now = new Date();

    const [order] = await db.insert(orders).values({
      id: crypto.randomUUID(),
      storeId: data.storeId,
      customerId: data.customerId,
      entryNo: typeof data.entryNo === 'string' ? parseInt(data.entryNo) : (data.entryNo || Math.floor(Math.random() * 100000)),
      primaryCost: String(data.primaryCost),
      totalCostWithCommission: String(data.totalCostWithCommission),
      totalCostWithoutCommission: String(data.totalCostWithoutCommission),
      costAfterCommission: String(data.costAfterCommission),
      commissionPercentage: String(data.commissionPercentage),
      commissionValue: String(data.commissionValue),
      previousReserve: String(data.previousReserve),
      currentReserve: String(data.currentReserve),
      finalReserve: String(data.finalReserve),
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const productEntries = Object.entries(data.products);
    for (const [productId, product] of productEntries) {
      const qty = Number(product.quantity) || 0;
      if (qty <= 0) continue;

      await db.insert(orderProducts).values({
        id: crypto.randomUUID(),
        storeId: data.storeId,
        orderId: order.id,
        productId: product.productId || productId || null,
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

      const effectiveProductId = product.productId || productId;
      if (effectiveProductId && !product.allowPreOrder) {
        // Lock row to prevent concurrent race conditions
        const result = await db.execute(
          sql`SELECT inventory FROM btracker_products WHERE id = ${effectiveProductId} FOR UPDATE`
        ) as { rows: { inventory: number }[] };

        const row = result.rows[0];
        if (row && row.inventory !== undefined) {
          const prevQty = Number(row.inventory);
          const newQty = Math.max(0, prevQty - qty);
          await db
            .update(products)
            .set({ inventory: newQty, updatedAt: now })
            .where(eq(products.id, effectiveProductId));

          await db.insert(inventoryLogs).values({
            id: crypto.randomUUID(),
            storeId: data.storeId,
            type: 'sale',
            productId: effectiveProductId,
            orderId: order.id,
            customerId: data.customerId,
            userId: data.createdBy,
            quantityChanged: String(-qty),
            previousQuantity: String(prevQty),
            newQuantity: String(newQty),
            priceAtTransaction: String(product.price),
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return order;
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

    const [ordersData, totalResult] = await Promise.all([
      db.select().from(orders)
        .where(and(...where))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(orders).where(and(...where)),
    ]);

    const ordersWithRelations = await Promise.all(
      ordersData.map(async (order) => {
        const [orderItems, customer, user] = await Promise.all([
          db.select().from(orderProducts).where(eq(orderProducts.orderId, order.id)),
          db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1),
          order.createdBy
            ? db.select({ name: users.name, email: users.email }).from(users).where(eq(users.clerkUserId, order.createdBy)).limit(1)
            : Promise.resolve([]),
        ]);

        return {
          ...order,
          customer: customer[0] ? { id: customer[0].id, name: customer[0].name } : { id: order.customerId, name: 'Unknown' },
          createdBy: { id: order.createdBy || '', name: user[0]?.name || 'Unknown', email: user[0]?.email || null },
          products: orderItems.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            returnedQuantity: item.returnedQuantity,
            price: item.price,
            acceptCommission: item.acceptCommission,
            allowPreOrder: item.allowPreOrder,
          })),
        };
      })
    );

    return {
      data: ordersWithRelations,
      total: totalResult[0]?.count || 0,
    };
  },

  async getLatestEntryNo(env: Env, storeId: string): Promise<number> {
    try {
      const db = getDb(env);
      const result = await db
        .select({ entryNo: orders.entryNo })
        .from(orders)
        .where(eq(orders.storeId, storeId))
        .orderBy(desc(orders.entryNo))
        .limit(1);

      if (!result || result.length === 0) {
        return 0;
      }
      return result[0].entryNo ?? 0;
    } catch (error) {
      console.error('Error getting latest entry no:', error);
      return 0;
    }
  },
};