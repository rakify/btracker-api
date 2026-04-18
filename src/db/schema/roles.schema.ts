import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const roles = pgTable('btracker_roles', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  storeId: uuid('store_id'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;