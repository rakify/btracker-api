import { desc, eq, and, count } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { roles, permissions, rolePermissions } from '../../db/schema/index.js';
import type { CreateRoleInput, UpdateRoleInput, RoleQuery } from './roles.validators.js';
import type { Env } from '../../config/env.js';

export const rolesRepository = {
  async create(env: Env, data: CreateRoleInput) {
    const db = getDb(env);
    const now = new Date();
    const [role] = await db.insert(roles).values({
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      storeId: data.storeId,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return role;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.roles.findFirst({
      where: eq(roles.id, id),
    });
  },

  async update(env: Env, id: string, data: UpdateRoleInput) {
    const db = getDb(env);
    const [role] = await db.update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(roles)
      .set({ deletedAt: new Date() })
      .where(eq(roles.id, id));
  },

  async findAll(env: Env, query: RoleQuery) {
    const db = getDb(env);
    const { page, limit, storeId } = query;
    const offset = (page - 1) * limit;

    const where = [];
    if (storeId) where.push(eq(roles.storeId, storeId));

    const [data, totalResult] = await Promise.all([
      db.select().from(roles)
        .where(and(...where))
        .orderBy(desc(roles.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(roles).where(and(...where)),
    ]);

    return {
      data,
      total: totalResult[0]?.count || 0,
    };
  },

  async findByStore(env: Env, storeId: string) {
    const db = getDb(env);
    return db.query.roles.findMany({
      where: eq(roles.storeId, storeId),
      orderBy: desc(roles.createdAt),
    });
  },

  async findByStoreWithPermissions(env: Env, storeId: string) {
    const db = getDb(env);
    const rolesData = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        storeId: roles.storeId,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        deletedAt: roles.deletedAt,
        createdBy: roles.createdBy,
        updatedBy: roles.updatedBy,
        deletedBy: roles.deletedBy,
        permissionId: permissions.id,
        permissionName: permissions.name,
        permissionDescription: permissions.description,
        permissionGroup: permissions.group,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(roles.storeId, storeId))
      .orderBy(desc(roles.createdAt));

    // Group permissions by role
    const roleMap = new Map();
    rolesData.forEach((row) => {
      if (!roleMap.has(row.id)) {
        roleMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          storeId: row.storeId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deletedAt: row.deletedAt,
          createdBy: row.createdBy,
          updatedBy: row.updatedBy,
          deletedBy: row.deletedBy,
          permissions: [],
        });
      }

      if (row.permissionId) {
        roleMap.get(row.id).permissions.push({
          id: row.permissionId,
          name: row.permissionName,
          description: row.permissionDescription,
          group: row.permissionGroup,
        });
      }
    });

    return Array.from(roleMap.values());
  },

  async findByIdWithPermissions(env: Env, id: string, storeId: string) {
    const db = getDb(env);
    const rolesData = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        storeId: roles.storeId,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        deletedAt: roles.deletedAt,
        createdBy: roles.createdBy,
        updatedBy: roles.updatedBy,
        deletedBy: roles.deletedBy,
        permissionId: permissions.id,
        permissionName: permissions.name,
        permissionDescription: permissions.description,
        permissionGroup: permissions.group,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(eq(roles.id, id), eq(roles.storeId, storeId)));

    if (rolesData.length === 0) return null;

    const role = rolesData[0];
    const permissionsList = rolesData
      .filter(row => row.permissionId)
      .map(row => ({
        id: row.permissionId!,
        name: row.permissionName!,
        description: row.permissionDescription,
        group: row.permissionGroup!,
      }));

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      storeId: role.storeId,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      deletedAt: role.deletedAt,
      createdBy: role.createdBy,
      updatedBy: role.updatedBy,
      deletedBy: role.deletedBy,
      permissions: permissionsList,
    };
  },
};