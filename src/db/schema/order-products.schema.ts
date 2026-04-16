import { pgTable, text, timestamp, uuid, numeric, boolean } from 'drizzle-orm/pg-core';

export const orderProducts = pgTable('btracker_order_products', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  orderId: uuid('order_id').notNull(),
  productId: uuid('product_id'),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  returnedQuantity: numeric('returned_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  acceptCommission: boolean('accept_commission').notNull().default(false),
  allowPreOrder: boolean('allow_pre_order').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type OrderProduct = typeof orderProducts.$inferSelect;
export type NewOrderProduct = typeof orderProducts.$inferInsert;