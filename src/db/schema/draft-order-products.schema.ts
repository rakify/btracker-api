import { pgTable, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const draftOrderProducts = pgTable('btracker_draft_order_products', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  draftOrderId: uuid('draft_order_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type DraftOrderProduct = typeof draftOrderProducts.$inferSelect;
export type NewDraftOrderProduct = typeof draftOrderProducts.$inferInsert;