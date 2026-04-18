import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const masterWalletTransactions = pgTable('btracker_master_wallet_transactions', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id').notNull(),
  masterWalletId: uuid('master_wallet_id').notNull(),
  type: text('type').notNull(),
  direction: text('direction').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  previousBalance: numeric('previous_balance', { precision: 12, scale: 2 }).notNull(),
  newBalance: numeric('new_balance', { precision: 12, scale: 2 }).notNull(),
  expenseCategoryId: uuid('expense_category_id'),
  memberUserId: text('member_user_id'),
  customerId: uuid('customer_id'),
  orderId: uuid('order_id'),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  note: text('note'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type MasterWalletTransaction = typeof masterWalletTransactions.$inferSelect;
export type NewMasterWalletTransaction = typeof masterWalletTransactions.$inferInsert;