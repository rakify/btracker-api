import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { activityLogs } from '../../db/schema/index.js';
import type { CreateActivityLogInput, ActivityLogQuery } from './activity-logs.validators.js';
import type { Env } from '../../config/env.js';

export const activityLogsRepository = {
  async create(env: Env, data: CreateActivityLogInput) {
    const db = getDb(env);
    const now = new Date();
    const [log] = await db.insert(activityLogs).values({
      id: crypto.randomUUID(),
      storeId: data.storeId,
      trackableType: data.trackableType,
      trackableId: data.trackableId,
      action: data.action,
      createdBy: data.createdBy,
      metadata: data.metadata || {},
      createdAt: now,
      updatedAt: now,
    }).returning();
    return log;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.activityLogs.findFirst({
      where: eq(activityLogs.id, id),
    });
  },

  async findAll(env: Env, query: ActivityLogQuery) {
    const db = getDb(env);
    const { page, limit, storeId, trackableType, action } = query;
    const offset = (page - 1) * limit;

    const where = [eq(activityLogs.storeId, storeId)];
    if (trackableType) where.push(eq(activityLogs.trackableType, trackableType));
    if (action) where.push(eq(activityLogs.action, action));

    const [data, totalResult] = await Promise.all([
      db.select().from(activityLogs)
        .where(and(...where))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(activityLogs).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },
};