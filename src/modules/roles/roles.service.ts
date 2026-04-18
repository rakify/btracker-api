import { rolesRepository } from './roles.repository.js';
import type { CreateRoleInput, UpdateRoleInput, RoleQuery } from './roles.validators.js';
import type { Env } from '../../config/env.js';

export const rolesService = {
  async create(env: Env, data: CreateRoleInput) {
    return rolesRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return rolesRepository.findById(env, id);
  },

  async update(env: Env, id: string, data: UpdateRoleInput) {
    return rolesRepository.update(env, id, data);
  },

  async delete(env: Env, id: string) {
    return rolesRepository.delete(env, id);
  },

  async findAll(env: Env, query: RoleQuery) {
    return rolesRepository.findAll(env, query);
  },

  async findByStore(env: Env, storeId: string) {
    return rolesRepository.findByStore(env, storeId);
  },

  async findByStoreWithPermissions(env: Env, storeId: string) {
    return rolesRepository.findByStoreWithPermissions(env, storeId);
  },

  async findByIdWithPermissions(env: Env, id: string, storeId: string) {
    return rolesRepository.findByIdWithPermissions(env, id, storeId);
  },
};