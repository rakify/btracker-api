import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { storeInvitations } from '../../db/schema/index.js';
import type { CreateInvitationInput, UpdateInvitationInput, InvitationQuery } from './invitations.validators.js';
import type { Env } from '../../config/env.js';

export const invitationsRepository = {
  async create(env: Env, data: CreateInvitationInput) {
    const db = getDb(env);
    const now = new Date();
    const token = crypto.randomUUID();
    const [invitation] = await db.insert(storeInvitations).values({
      id: crypto.randomUUID(),
      storeId: data.storeId,
      invitedEmail: data.invitedEmail,
      roleId: data.roleId,
      token,
      status: 'pending',
      expiresAt: data.expiresAt,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return { ...invitation, token };
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.storeInvitations.findFirst({
      where: eq(storeInvitations.id, id),
    });
  },

  async findByToken(env: Env, token: string) {
    const db = getDb(env);
    return db.query.storeInvitations.findFirst({
      where: eq(storeInvitations.token, token),
    });
  },

  async findByEmail(env: Env, storeId: string, email: string) {
    const db = getDb(env);
    return db.query.storeInvitations.findFirst({
      where: and(
        eq(storeInvitations.storeId, storeId),
        eq(storeInvitations.invitedEmail, email)
      ),
    });
  },

  async update(env: Env, id: string, data: UpdateInvitationInput) {
    const db = getDb(env);
    const [invitation] = await db.update(storeInvitations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storeInvitations.id, id))
      .returning();
    return invitation;
  },

  async findAll(env: Env, query: InvitationQuery) {
    const db = getDb(env);
    const { page, limit, storeId } = query;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select().from(storeInvitations)
        .where(eq(storeInvitations.storeId, storeId))
        .orderBy(desc(storeInvitations.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(storeInvitations).where(eq(storeInvitations.storeId, storeId)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(storeInvitations)
      .set({ deletedAt: new Date() })
      .where(eq(storeInvitations.id, id));
  },
};