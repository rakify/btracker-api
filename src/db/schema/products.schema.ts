import { pgTable, text, timestamp, uuid, integer, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';

export const products = pgTable('btracker_products', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  images: jsonb('images'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
  allowPreOrder: boolean('allow_pre_order').notNull().default(false),
  acceptCommission: boolean('accept_commission').notNull().default(false),
  isCustom: boolean('is_custom').notNull().default(false),
  inventory: integer('inventory').notNull().default(0),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;