import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const userRoles = pgTable('btracker_user_roles', {
  userId: text('user_id').notNull(),
  roleId: uuid('role_id').notNull(),
  storeId: uuid('store_id'),
});

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;