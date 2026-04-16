import { pgTable, text, timestamp, uuid, numeric } from 'drizzle-orm/pg-core';

export const masterWallets = pgTable('btracker_master_wallets', {
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  storeId: uuid('store_id').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type MasterWallet = typeof masterWallets.$inferSelect;
export type NewMasterWallet = typeof masterWallets.$inferInsert;