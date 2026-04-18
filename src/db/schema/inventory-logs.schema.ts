import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const inventoryLogs = pgTable('btracker_inventory_logs', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  type: text('type').notNull(),
  productId: uuid('product_id').notNull(),
  orderId: uuid('order_id'),
  customerId: uuid('customer_id'),
  userId: text('user_id'),
  quantityChanged: numeric('quantity_changed', { precision: 10, scale: 2 }).notNull(),
  previousQuantity: numeric('previous_quantity', { precision: 10, scale: 2 }).notNull(),
  newQuantity: numeric('new_quantity', { precision: 10, scale: 2 }).notNull(),
  priceAtTransaction: numeric('price_at_transaction', { precision: 10, scale: 2 }),
  commissionAmount: numeric('commission_amount', { precision: 10, scale: 2 }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type NewInventoryLog = typeof inventoryLogs.$inferInsert;