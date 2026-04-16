import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const stores = pgTable('btracker_stores', {
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  currencySymbol: text('currency_symbol').notNull().default('৳'),
  active: boolean('active').notNull().default(false),
  activeSince: timestamp('active_since', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;