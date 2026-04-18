import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const customerTransactions = pgTable('btracker_customer_transactions', {
  storeId: uuid('store_id').notNull(),
  id: uuid('id').primaryKey(),
  customerId: uuid('customer_id').notNull(),
  orderId: uuid('order_id'),
  transactionType: text('transaction_type').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  previousBalance: numeric('previous_balance', { precision: 10, scale: 2 }).notNull(),
  newBalance: numeric('new_balance', { precision: 10, scale: 2 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type CustomerTransaction = typeof customerTransactions.$inferSelect;
export type NewCustomerTransaction = typeof customerTransactions.$inferInsert;