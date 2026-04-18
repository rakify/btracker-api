import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const draftOrders = pgTable('btracker_draft_orders', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  customerId: uuid('customer_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type DraftOrder = typeof draftOrders.$inferSelect;
export type NewDraftOrder = typeof draftOrders.$inferInsert;