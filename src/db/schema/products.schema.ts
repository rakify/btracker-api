import { pgTable, text, timestamp, uuid, integer, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('btracker_products', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  images: jsonb('images'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  allowPreOrder: boolean('allow_pre_order').notNull(),
  acceptCommission: boolean('accept_commission').notNull(),
  isCustom: boolean('is_custom').notNull(),
  inventory: integer('inventory').notNull(),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;