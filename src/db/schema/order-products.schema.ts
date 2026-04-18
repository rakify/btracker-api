import { pgTable, text, timestamp, uuid, numeric, boolean } from 'drizzle-orm/pg-core';

export const orderProducts = pgTable('btracker_order_products', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  orderId: uuid('order_id').notNull(),
  productId: uuid('product_id'),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  returnedQuantity: numeric('returned_quantity', { precision: 10, scale: 2 }).notNull(),
  acceptCommission: boolean('accept_commission').notNull(),
  allowPreOrder: boolean('allow_pre_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type OrderProduct = typeof orderProducts.$inferSelect;
export type NewOrderProduct = typeof orderProducts.$inferInsert;