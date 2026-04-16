import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const storeInvitations = pgTable('btracker_store_invitations', {
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  storeId: uuid('store_id').notNull(),
  invitedEmail: text('invited_email').notNull(),
  roleId: uuid('role_id'),
  token: text('token').notNull().unique(),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type StoreInvitation = typeof storeInvitations.$inferSelect;
export type NewStoreInvitation = typeof storeInvitations.$inferInsert;