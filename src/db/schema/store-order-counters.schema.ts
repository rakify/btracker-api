import { pgTable, timestamp, uuid, integer } from 'drizzle-orm/pg-core';

export const storeOrderCounters = pgTable('btracker_store_order_counters', {
  id: uuid('id').$defaultFn(() => crypto.randomUUID()).primaryKey(),
  latestEntryNo: integer('latest_entry_no').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export type StoreOrderCounter = typeof storeOrderCounters.$inferSelect;
export type NewStoreOrderCounter = typeof storeOrderCounters.$inferInsert;