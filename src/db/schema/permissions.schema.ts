import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const permissions = pgTable('btracker_permissions', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  group: text('group').notNull(),
});

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;