import { walletsRepository } from './wallets.repository.js';
import type { CreateWalletInput, WalletQuery } from './wallets.validators.js';
import type { Env } from '../../config/env.js';

export const walletsService = {
  async getMasterWallet(env: Env, storeId: string) {
    return walletsRepository.getMasterWallet(env, storeId);
  },

  async createMasterWallet(env: Env, data: CreateWalletInput) {
    return walletsRepository.createMasterWallet(env, data);
  },

  async getMemberWallet(env: Env, storeId: string, memberUserId: string) {
    return walletsRepository.getMemberWallet(env, storeId, memberUserId);
  },

  async createMemberWallet(env: Env, data: { storeId: string; memberUserId: string; balance?: string; createdBy?: string }) {
    return walletsRepository.createMemberWallet(env, data);
  },

  async findAllMemberWallets(env: Env, query: WalletQuery) {
    return walletsRepository.findAllMemberWallets(env, query);
  },

  async updateMasterWalletBalance(env: Env, storeId: string, newBalance: string) {
    return walletsRepository.updateMasterWalletBalance(env, storeId, newBalance);
  },

  async updateMemberWalletBalance(env: Env, id: string, newBalance: string) {
    return walletsRepository.updateMemberWalletBalance(env, id, newBalance);
  },
};