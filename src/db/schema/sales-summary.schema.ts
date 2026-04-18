import { pgTable, text, timestamp, uuid, date, numeric } from 'drizzle-orm/pg-core';

export const salesSummary = pgTable('btracker_sales_summary', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  summaryType: text('summary_type').notNull(),
  dateStart: date('date_start').notNull(),
  dateEnd: date('date_end').notNull(),
  totalQuantity: numeric('total_quantity', { precision: 10, scale: 2 }).notNull(),
  totalSales: numeric('total_sales', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type SalesSummary = typeof salesSummary.$inferSelect;
export type NewSalesSummary = typeof salesSummary.$inferInsert;