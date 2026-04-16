import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const adminRoles = pgTable('btracker_admin_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type AdminRole = typeof adminRoles.$inferSelect;
export type NewAdminRole = typeof adminRoles.$inferInsert;