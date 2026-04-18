import { desc, eq } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { customerTransactions } from '../../db/schema/index.js';
import type { CustomerTransactionsQuery } from './customer-transactions.validators.js';
import type { Env } from '../../config/env.js';

export const customerTransactionsRepository = {
  async findByCustomerId(env: Env, query: CustomerTransactionsQuery) {
    const db = getDb(env);
    const { customerId } = query;

    return db
      .select()
      .from(customerTransactions)
      .where(eq(customerTransactions.customerId, customerId))
      .orderBy(desc(customerTransactions.createdAt));
  },
};