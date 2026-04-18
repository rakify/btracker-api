import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const memberWallets = pgTable('btracker_member_wallets', {
  id: uuid('id').primaryKey(),
  storeId: uuid('store_id').notNull(),
  memberUserId: text('member_user_id').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type MemberWallet = typeof memberWallets.$inferSelect;
export type NewMemberWallet = typeof memberWallets.$inferInsert;