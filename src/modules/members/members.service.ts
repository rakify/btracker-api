import { membersRepository } from './members.repository.js';
import type { MembersQuery, UpdateMemberRoleInput } from './members.validators.js';
import type { Env } from '../../config/env.js';

export const membersService = {
  async findByStore(env: Env, query: MembersQuery) {
    return membersRepository.findByStore(env, query);
  },

  async findByUserId(env: Env, userId: string, storeId: string) {
    return membersRepository.findByUserId(env, userId, storeId);
  },

  async updateRole(env: Env, userId: string, storeId: string, data: UpdateMemberRoleInput) {
    return membersRepository.updateRole(env, userId, storeId, data);
  },

  async removeMember(env: Env, userId: string, storeId: string) {
    return membersRepository.removeMember(env, userId, storeId);
  },
};