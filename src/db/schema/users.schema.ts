import { pgTable, text, timestamp, boolean, uuid, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('btracker_users', {
  id: uuid('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: boolean('email_verified').notNull(),
  avatarUrl: text('avatar_url'),
  username: text('username'),
  phoneNumber: text('phone_number'),
  signUpMethod: text('sign_up_method'), // 'google', 'email', 'oauth', etc.
  passwordEnabled: boolean('password_enabled').notNull().default(false),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  banned: boolean('banned').notNull().default(false),
  lastSignInAt: timestamp('last_sign_in_at'),
  publicMetadata: jsonb('public_metadata'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;