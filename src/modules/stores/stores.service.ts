import { getDb } from '../../db/client.js';
import { stores, roles, permissions, rolePermissions, userRoles } from '../../db/schema/index.js';
import { storesRepository } from './stores.repository.js';
import type { CreateStoreInput, UpdateStoreInput, StoreQuery } from './stores.validators.js';
import type { Env } from '../../config/env.js';
import { eq } from 'drizzle-orm';

export const storesService = {
  async create(env: Env, data: CreateStoreInput, userId: string) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await storesRepository.findBySlug(env, slug);
    if (existing) {
      throw new Error('Store name already taken');
    }

    // Force active to false when creating - store must be activated by super admin
    const storeData = { ...data, active: false };
    const store = await storesRepository.create(env, storeData, userId);

    return store;
  },

  async activateStore(env: Env, storeId: string, userId: string) {
    const db = getDb(env);
    const now = new Date();

    // Activate the store
    const [updatedStore] = await db.update(stores)
      .set({ active: true, activeSince: now })
      .where(eq(stores.id, storeId))
      .returning();

    // Get all permissions
    const allPermissions = await db.select({ id: permissions.id, name: permissions.name }).from(permissions);

    // Create Admin role with all permissions
    const [adminRole] = await db.insert(roles).values({
      id: crypto.randomUUID(),
      name: 'Admin',
      storeId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    for (const permission of allPermissions) {
      await db.insert(rolePermissions).values({
        roleId: adminRole.id,
        permissionId: permission.id,
      });
    }

    // Assign Admin role to store creator (not the admin who activated)
    await db.insert(userRoles).values({
      userId: updatedStore.userId,
      roleId: adminRole.id,
      storeId,
    });

    // Create Manager role with limited permissions (just view permissions by default)
    const [managerRole] = await db.insert(roles).values({
      id: crypto.randomUUID(),
      name: 'Manager',
      storeId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Manager gets view permissions
    const viewPermissions = allPermissions.filter(p =>
      p.name?.startsWith('can_view')
    );
    for (const permission of viewPermissions) {
      await db.insert(rolePermissions).values({
        roleId: managerRole.id,
        permissionId: permission.id,
      });
    }

    // Create Staff role (minimal permissions)
    await db.insert(roles).values({
      id: crypto.randomUUID(),
      name: 'Staff',
      storeId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return updatedStore;
  },

  async findById(env: Env, id: string) {
    return storesRepository.findById(env, id);
  },

  async findBySlug(env: Env, slug: string) {
    return storesRepository.findBySlug(env, slug);
  },

  async update(env: Env, id: string, data: UpdateStoreInput) {
    return storesRepository.update(env, id, data);
  },

  async delete(env: Env, id: string) {
    return storesRepository.delete(env, id);
  },

  async findAll(env: Env, query: StoreQuery) {
    return storesRepository.findAll(env, query);
  },

  async findByUser(env: Env, userId: string) {
    return storesRepository.findByUser(env, userId);
  },

  async findPending(env: Env) {
    return storesRepository.findPending(env);
  },
};