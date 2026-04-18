import { desc, eq, and, count, like, asc, gte, lte, isNotNull, isNull } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { customers, orders, orderProducts, products, userProfiles } from '../../db/schema/index.js';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQuery, CustomerOrdersQuery } from './customers.validators.js';
import type { Env } from '../../config/env.js';

export const customersRepository = {
  async create(env: Env, data: CreateCustomerInput) {
    const db = getDb(env);
    const now = new Date();
    const [customer] = await db.insert(customers).values({
      id: crypto.randomUUID(),
      storeId: data.storeId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      balance: String(data.balance),
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return customer;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.customers.findFirst({
      where: eq(customers.id, id),
    });
  },

  async update(env: Env, id: string, data: UpdateCustomerInput) {
    const db = getDb(env);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.balance !== undefined) updateData.balance = String(data.balance);
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;
    
    const [customer] = await db.update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(customers)
      .set({ deletedAt: new Date() })
      .where(eq(customers.id, id));
  },

  async findAll(env: Env, query: CustomerQuery) {
    const db = getDb(env);
    const { page, limit, storeId, search, status, from, to, sort } = query;
    const offset = (page - 1) * limit;

    const fallbackPage = isNaN(page) || page < 1 ? 1 : page;
    const limitValue = isNaN(limit) ? 10 : limit;
    const offsetValue = fallbackPage > 0 ? (fallbackPage - 1) * limitValue : 0;

    const [column, order] = (sort?.split(".") as [
      keyof typeof customers.$inferSelect | undefined,
      "asc" | "desc" | undefined
    ]) ?? ["createdAt", "desc"];

    const fromDay = from ? new Date(from) : undefined;
    const toDay = to ? new Date(to) : undefined;

    const baseConditions = [
      eq(customers.storeId, storeId),
      search ? like(customers.name, `%${search}%`) : undefined,
      fromDay && toDay ? and(gte(customers.createdAt, fromDay), lte(customers.createdAt, toDay)) : undefined,
      status === "deleted" ? isNotNull(customers.deletedAt) :
      status === "active" ? isNull(customers.deletedAt) : undefined
    ].filter(Boolean);

    const whereClause = baseConditions.length > 1 ? and(...baseConditions) : baseConditions[0] || eq(customers.storeId, storeId);

    const sortableColumns: Record<string, any> = {
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      balance: customers.balance,
      createdAt: customers.createdAt,
    };

    const safeColumn = column && sortableColumns[column] ? sortableColumns[column] : customers.createdAt;

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          address: customers.address,
          balance: customers.balance,
          createdAt: customers.createdAt,
          createdBy: customers.createdBy,
          deletedAt: customers.deletedAt,
          deletedBy: customers.deletedBy,
        })
        .from(customers)
        .where(whereClause)
        .limit(limitValue)
        .offset(offsetValue)
        .orderBy(order === "asc" ? asc(safeColumn) : desc(safeColumn)),
      db
        .select({ count: count(customers.id) })
        .from(customers)
        .where(whereClause)
        .then((res) => res[0]?.count ?? 0),
    ]);

    return {
      data,
      pageCount: Math.ceil(totalResult / limitValue),
    };
  },

  async findByIdWithStatus(env: Env, id: string, storeId: string, status?: 'active' | 'deleted' | 'all') {
    const db = getDb(env);

    const conditions = [
      eq(customers.id, id),
      eq(customers.storeId, storeId),
      status === "deleted" ? isNotNull(customers.deletedAt) :
      status === "active" ? isNull(customers.deletedAt) : undefined
    ].filter(Boolean);

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    return db.query.customers.findFirst({
      where: whereClause,
    });
  },

  async findCustomerOrders(env: Env, query: CustomerOrdersQuery) {
    const db = getDb(env);
    const { page, per_page, storeId, customerId, from, to, sort, createdBy } = query;

    const limit = per_page;
    const offset = (page - 1) * limit;

    const [column, order] = (sort?.split(".") as [
      keyof typeof orders.$inferSelect | undefined,
      "asc" | "desc" | undefined
    ]) ?? ["createdAt", "desc"];

    const fromDay = from ? new Date(from) : undefined;
    const toDay = to ? new Date(to) : undefined;

    const sortableColumns: Record<string, any> = {
      entryNo: orders.entryNo,
      totalCostWithCommission: orders.totalCostWithCommission,
      createdAt: orders.createdAt,
    };

    const safeColumn = column && sortableColumns[column] ? sortableColumns[column] : orders.createdAt;

    const [ordersData, totalCount] = await Promise.all([
      db.query.orders.findMany({
        where: and(
          eq(orders.storeId, storeId),
          eq(orders.customerId, customerId),
          fromDay && toDay ? and(gte(orders.createdAt, fromDay), lte(orders.createdAt, toDay)) : undefined,
          createdBy ? eq(orders.createdBy, createdBy) : undefined
        ),
        with: {
          products: {
            with: {
              product: true,
            },
          },
          createdByUser: true,
        },
        limit,
        offset,
        orderBy: order === "asc" ? asc(safeColumn) : desc(safeColumn),
      }),
      db
        .select({ count: count(orders.id) })
        .from(orders)
        .where(and(
          eq(orders.storeId, storeId),
          eq(orders.customerId, customerId),
          fromDay && toDay ? and(gte(orders.createdAt, fromDay), lte(orders.createdAt, toDay)) : undefined,
          createdBy ? eq(orders.createdBy, createdBy) : undefined
        ))
        .then((res) => res[0]?.count ?? 0),
    ]);

    const pageCount = Math.ceil(totalCount / limit);

    return {
      data: ordersData,
      pageCount,
    };
  },
};