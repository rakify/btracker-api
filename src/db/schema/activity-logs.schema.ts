import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const activityLogs = pgTable('btracker_activity_logs', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  trackableType: text('trackable_type').notNull(),
  trackableId: uuid('trackable_id').notNull(),
  action: text('action').notNull(),
  createdBy: text('created_by').notNull(),
  metadata: jsonb('metadata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;