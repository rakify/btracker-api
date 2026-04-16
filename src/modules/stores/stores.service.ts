import { getDb } from '../../db/client.js';
import { roles, permissions, rolePermissions, userRoles } from '../../db/schema/index.js';
import { storesRepository } from './stores.repository.js';
import type { CreateStoreInput, UpdateStoreInput, StoreQuery } from './stores.validators.js';
import type { Env } from '../../config/env.js';

export const storesService = {
  async create(env: Env, data: CreateStoreInput, userId: string) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await storesRepository.findBySlug(env, slug);
    if (existing) {
      throw new Error('Store name already taken');
    }
    
    const store = await storesRepository.create(env, data, userId);
    
    const db = getDb(env);
    const now = new Date();
    const [managerRole] = await db.insert(roles).values({
      name: 'Manager',
      storeId: store.id,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    }).returning();
    
    const allPermissions = await db.select({ id: permissions.id }).from(permissions);
    
    for (const permission of allPermissions) {
      await db.insert(rolePermissions).values({
        roleId: managerRole.id,
        permissionId: permission.id,
      });
    }
    
    await db.insert(userRoles).values({
      userId,
      roleId: managerRole.id,
      storeId: store.id,
    });
    
    return store;
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
};