import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('btracker_user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  isBanned: boolean('is_banned'),
  bannedAt: timestamp('banned_at'),
  bannedBy: text('banned_by'),
  banReason: text('ban_reason'),
  lastLoginAt: timestamp('last_login_at'),
  profileData: jsonb('profile_data'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  deletedBy: text('deleted_by'),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;