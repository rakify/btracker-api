import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { masterWallets, memberWallets } from '../../db/schema/index.js';
import type { CreateWalletInput, WalletQuery } from './wallets.validators.js';
import type { Env } from '../../config/env.js';

export const walletsRepository = {
  async getMasterWallet(env: Env, storeId: string) {
    const db = getDb(env);
    return db.query.masterWallets.findFirst({
      where: eq(masterWallets.storeId, storeId),
    });
  },

  async createMasterWallet(env: Env, data: CreateWalletInput) {
    const db = getDb(env);
    const now = new Date();
    const [wallet] = await db.insert(masterWallets).values({
      storeId: data.storeId,
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
};