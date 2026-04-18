import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const memberWalletTransactions = pgTable('btracker_member_wallet_transactions', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id').notNull(),
  memberWalletId: uuid('member_wallet_id').notNull(),
  memberUserId: text('member_user_id').notNull(),
  type: text('type').notNull(),
  direction: text('direction').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  previousBalance: numeric('previous_balance', { precision: 12, scale: 2 }).notNull(),
  newBalance: numeric('new_balance', { precision: 12, scale: 2 }).notNull(),
  masterWalletTransactionId: uuid('master_wallet_transaction_id'),
  orderId: uuid('order_id'),
  note: text('note'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type MemberWalletTransaction = typeof memberWalletTransactions.$inferSelect;
export type NewMemberWalletTransaction = typeof memberWalletTransactions.$inferInsert;