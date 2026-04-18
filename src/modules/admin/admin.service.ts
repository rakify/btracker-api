import { adminRepository } from './admin.repository.js';
import type {
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
  StoreActionInput,
} from './admin.validators.js';
import type { Env } from '../../config/env.js';

export const adminService = {
  async isSuperAdmin(env: Env, userId: string): Promise<boolean> {
    const adminRole = await adminRepository.findByUserId(env, userId);
    return adminRole?.role === 'super_admin';
  },

  async getUserAdminRole(env: Env, userId: string) {
    return adminRepository.findByUserId(env, userId);
  },

  async hasAdminPermission(env: Env, userId: string, permission: string): Promise<boolean> {
    const adminRole = await adminRepository.findByUserId(env, userId);

    if (!adminRole) {
      return false;
    }

    // Super admin has all permissions
    if (adminRole.role === 'super_admin') {
      return true;
    }

    // Check specific permissions in the JSONB field
    const permissions = adminRole.permissions;
    if (!permissions || typeof permissions !== 'object') {
      return false;
    }

    const perms = permissions as Record<string, any>;
    return perms[permission] === true;
  },

  async isAdmin(env: Env, userId: string): Promise<boolean> {
    const adminRole = await adminRepository.findByUserId(env, userId);
    return !!adminRole;
  },

  async isBanned(env: Env, userId: string): Promise<boolean> {
    return adminRepository.isBanned(env, userId);
  },

  async getAllAdmins(env: Env) {
    return adminRepository.findAll(env);
  },

  async getAllStoresForAdmin(env: Env) {
    return adminRepository.getAllStoresForAdmin(env);
  },

  async activateStore(env: Env, data: StoreActionInput, adminUserId: string): Promise<boolean> {
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(env, adminUserId);
    if (!isUserAdmin) {
      throw new Error('Unauthorized: Only admins can activate stores');
    }

    const store = await adminRepository.activateStore(env, data.storeId, adminUserId);
    return !!store;
  },

  async deactivateStore(env: Env, data: StoreActionInput, adminUserId: string): Promise<boolean> {
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(env, adminUserId);
    if (!isUserAdmin) {
      throw new Error('Unauthorized: Only admins can deactivate stores');
    }

    const store = await adminRepository.deactivateStore(env, data.storeId, adminUserId);
    return !!store;
  },

  async getStoreStats(env: Env) {
    return adminRepository.getStoreStats(env);
  },

  async getAllUsers(env: Env) {
    return adminRepository.getAllUsers(env);
  },

  async createAdminRole(env: Env, data: CreateAdminRoleInput) {
    return adminRepository.create(env, data);
  },

  async updateAdminRole(env: Env, userId: string, data: UpdateAdminRoleInput) {
    return adminRepository.update(env, userId, data);
  },

  async deleteAdminRole(env: Env, userId: string) {
    return adminRepository.delete(env, userId);
  },
};
