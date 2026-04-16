import { pgTable, uuid } from 'drizzle-orm/pg-core';

export const rolePermissions = pgTable('btracker_role_permissions', {
  roleId: uuid('role_id').notNull(),
  permissionId: uuid('permission_id').notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;