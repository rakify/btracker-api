import { desc, eq, and, count, like } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { customers } from '../../db/schema/index.js';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQuery } from './customers.validators.js';
import type { Env } from '../../config/env.js';

export const customersRepository = {
  async create(env: Env, data: CreateCustomerInput) {
    const db = getDb(env);
    const now = new Date();
    const [customer] = await db.insert(customers).values({
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
    const { page, limit, storeId, search } = query;
    const offset = (page - 1) * limit;

    const baseWhere = eq(customers.storeId, storeId);
    
    let data;
    let totalResult;
    
    if (search) {
      const searchLower = `%${search}%`;
      data = await db.select().from(customers)
        .where(and(
          eq(customers.storeId, storeId),
          like(customers.name, searchLower)
        ))
        .orderBy(desc(customers.createdAt))
        .limit(limit)
        .offset(offset);
        
      totalResult = await db.select({ count: count() }).from(customers)
        .where(and(
          eq(customers.storeId, storeId),
          like(customers.name, searchLower)
        ));
    } else {
      [data, totalResult] = await Promise.all([
        db.select().from(customers)
          .where(baseWhere)
          .orderBy(desc(customers.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(customers).where(baseWhere),
      ]);
    }

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};