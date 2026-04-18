import { pgTable, text, timestamp, uuid, integer, numeric } from 'drizzle-orm/pg-core';

export const orders = pgTable('btracker_orders', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  customerId: uuid('customer_id').notNull(),
  entryNo: integer('entry_no').notNull(),
  primaryCost: numeric('primary_cost', { precision: 10, scale: 2 }).notNull(),
  totalCostWithCommission: numeric('total_cost_with_commission', { precision: 10, scale: 2 }).notNull(),
  totalCostWithoutCommission: numeric('total_cost_without_commission', { precision: 10, scale: 2 }).notNull(),
  costAfterCommission: numeric('cost_after_commission', { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).notNull(),
  commissionValue: numeric('commission_value', { precision: 10, scale: 2 }).notNull(),
  previousReserve: numeric('previous_reserve', { precision: 10, scale: 2 }).notNull(),
  currentReserve: numeric('current_reserve', { precision: 10, scale: 2 }).notNull(),
  finalReserve: numeric('final_reserve', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;