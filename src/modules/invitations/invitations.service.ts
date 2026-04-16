import { invitationsRepository } from './invitations.repository.js';
import type { CreateInvitationInput, UpdateInvitationInput, InvitationQuery } from './invitations.validators.js';
import type { Env } from '../../config/env.js';

export const invitationsService = {
  async create(env: Env, data: CreateInvitationInput) {
    return invitationsRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return invitationsRepository.findById(env, id);
  },

  async findByToken(env: Env, token: string) {
    return invitationsRepository.findByToken(env, token);
  },

  async findByEmail(env: Env, storeId: string, email: string) {
    return invitationsRepository.findByEmail(env, storeId, email);
  },

  async update(env: Env, id: string, data: UpdateInvitationInput) {
    return invitationsRepository.update(env, id, data);
  },

  async findAll(env: Env, query: InvitationQuery) {
    return invitationsRepository.findAll(env, query);
  },

  async delete(env: Env, id: string) {
    return invitationsRepository.delete(env, id);
  },
};