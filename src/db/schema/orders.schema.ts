import { pgTable, text, timestamp, uuid, integer, numeric } from 'drizzle-orm/pg-core';

export const orders = pgTable('btracker_orders', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  customerId: uuid('customer_id').notNull(),
  entryNo: integer('entry_no').notNull(),
  primaryCost: numeric('primary_cost', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCostWithCommission: numeric('total_cost_with_commission', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCostWithoutCommission: numeric('total_cost_without_commission', { precision: 10, scale: 2 }).notNull().default('0'),
  costAfterCommission: numeric('cost_after_commission', { precision: 10, scale: 2 }).notNull().default('0'),
  commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).notNull().default('0'),
  commissionValue: numeric('commission_value', { precision: 10, scale: 2 }).notNull().default('0'),
  previousReserve: numeric('previous_reserve', { precision: 10, scale: 2 }).notNull().default('0'),
  currentReserve: numeric('current_reserve', { precision: 10, scale: 2 }).notNull().default('0'),
  finalReserve: numeric('final_reserve', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;