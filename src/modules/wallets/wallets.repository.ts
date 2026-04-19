import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import {
  masterWallets,
  memberWallets,
  masterWalletTransactions,
  memberWalletTransactions,
  expenseCategories,
  customers,
  userRoles,
  users
} from '../../db/schema/index.js';
import type {
  CreateWalletInput,
  WalletQuery,
  MemberWalletTransactionsQuery,
  MasterWalletTransactionsQuery
} from './wallets.validators.js';
import type { Env } from '../../config/env.js';

export const walletsRepository = {
  async getMasterWallet(env: Env, storeId: string) {
    const db = getDb(env);
    return db.query.masterWallets.findFirst({
      where: eq(masterWallets.storeId, storeId),
    });
  },

  async createMasterWallet(env: Env, storeId: string, data: CreateWalletInput) {
    const db = getDb(env);
    const now = new Date();
    const [wallet] = await db.insert(masterWallets).values({
      id: crypto.randomUUID(),
      storeId,
      balance: String(data.balance),
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return wallet;
  },

  async getMemberWallet(env: Env, storeId: string, memberUserId: string) {
    const db = getDb(env);
    return db.query.memberWallets.findFirst({
      where: and(
        eq(memberWallets.storeId, storeId),
        eq(memberWallets.memberUserId, memberUserId)
      ),
    });
  },

  async createMemberWallet(env: Env, data: { storeId: string; memberUserId: string; balance?: string; createdBy?: string }) {
    const db = getDb(env);
    const now = new Date();
    const [wallet] = await db.insert(memberWallets).values({
      id: crypto.randomUUID(),
      storeId: data.storeId,
      memberUserId: data.memberUserId,
      balance: data.balance || '0',
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return wallet;
  },

  async findAllMemberWallets(env: Env, query: WalletQuery) {
    const db = getDb(env);
    const { page, limit, storeId } = query;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select().from(memberWallets)
        .where(eq(memberWallets.storeId, storeId))
        .orderBy(desc(memberWallets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(memberWallets).where(eq(memberWallets.storeId, storeId)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async updateMasterWalletBalance(env: Env, storeId: string, newBalance: string) {
    const db = getDb(env);
    const [wallet] = await db.update(masterWallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(masterWallets.storeId, storeId))
      .returning();
    return wallet;
  },

  async updateMemberWalletBalance(env: Env, id: string, newBalance: string) {
    const db = getDb(env);
    const [wallet] = await db.update(memberWallets)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(memberWallets.id, id))
      .returning();
    return wallet;
  },

  // Transaction methods
  async getMasterWalletTransactions(env: Env, query: MasterWalletTransactionsQuery) {
    const db = getDb(env);
    const { storeId, page, limit } = query;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select().from(masterWalletTransactions)
        .where(eq(masterWalletTransactions.storeId, storeId))
        .orderBy(desc(masterWalletTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(masterWalletTransactions)
        .where(eq(masterWalletTransactions.storeId, storeId)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async createMasterWalletTransaction(env: Env, transaction: any) {
    const db = getDb(env);
    const now = new Date();
    const [result] = await db.insert(masterWalletTransactions).values({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result;
  },

  async getMemberWalletTransactions(env: Env, query: MemberWalletTransactionsQuery) {
    const db = getDb(env);
    const { storeId, memberUserId, page, limit } = query;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select().from(memberWalletTransactions)
        .where(and(
          eq(memberWalletTransactions.storeId, storeId),
          eq(memberWalletTransactions.memberUserId, memberUserId)
        ))
        .orderBy(desc(memberWalletTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(memberWalletTransactions)
        .where(and(
          eq(memberWalletTransactions.storeId, storeId),
          eq(memberWalletTransactions.memberUserId, memberUserId)
        )),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async createMemberWalletTransaction(env: Env, transaction: any) {
    const db = getDb(env);
    const now = new Date();
    const [result] = await db.insert(memberWalletTransactions).values({
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result;
  },

  // Expense Categories methods
  async getExpenseCategoriesByStoreId(env: Env, storeId: string) {
    const db = getDb(env);
    return db.select().from(expenseCategories)
      .where(and(
        eq(expenseCategories.storeId, storeId),
        eq(expenseCategories.isActive, true)
      ))
      .orderBy(expenseCategories.sortOrder, expenseCategories.name);
  },

  async createExpenseCategory(env: Env, data: any) {
    const db = getDb(env);
    const now = new Date();
    const [result] = await db.insert(expenseCategories).values({
      ...data,
      id: crypto.randomUUID(),
      normalizedName: data.name.trim().toLowerCase().replace(/\s+/g, " "),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result;
  },

  async updateExpenseCategory(env: Env, id: string, data: any) {
    const db = getDb(env);
    const now = new Date();
    const [result] = await db.update(expenseCategories)
      .set({
        ...data,
        normalizedName: data.name ? data.name.trim().toLowerCase().replace(/\s+/g, " ") : undefined,
        updatedAt: now,
      })
      .where(eq(expenseCategories.id, id))
      .returning();
    return result;
  },

  async getExpenseCategoryById(env: Env, id: string, storeId: string) {
    const db = getDb(env);
    return db.query.expenseCategories.findFirst({
      where: and(
        eq(expenseCategories.id, id),
        eq(expenseCategories.storeId, storeId)
      ),
    });
  },

  // Utility methods
  async getCustomerById(env: Env, customerId: string, storeId: string) {
    const db = getDb(env);
    return db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.storeId, storeId)
      ),
    });
  },

  async getMemberRole(env: Env, storeId: string, userId: string) {
    const db = getDb(env);
    return db.query.userRoles.findFirst({
      where: and(
        eq(userRoles.storeId, storeId),
        eq(userRoles.userId, userId)
      ),
    });
  },

  // Get member wallets with user info
  async getMemberWalletsWithUserInfo(env: Env, storeId: string, page: number, limit: number) {
    const db = getDb(env);
    const offset = (page - 1) * limit;

    return db.select({
      id: memberWallets.id,
      storeId: memberWallets.storeId,
      memberUserId: memberWallets.memberUserId,
      balance: memberWallets.balance,
      createdAt: memberWallets.createdAt,
      updatedAt: memberWallets.updatedAt,
      member: {
        id: users.id,
        name: users.name,
        email: users.email,
      }
    })
    .from(memberWallets)
    .innerJoin(users, eq(memberWallets.memberUserId, users.clerkUserId))
    .where(eq(memberWallets.storeId, storeId))
    .orderBy(desc(memberWallets.updatedAt))
    .limit(limit)
    .offset(offset);
  },
};