import { inventoryLogsRepository } from './inventory-logs.repository.js';
import type { CreateInventoryLogInput, InventoryLogQuery } from './inventory-logs.validators.js';
import type { Env } from '../../config/env.js';

export const inventoryLogsService = {
  async create(env: Env, data: CreateInventoryLogInput) {
    return inventoryLogsRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return inventoryLogsRepository.findById(env, id);
  },

  async findAll(env: Env, query: InventoryLogQuery) {
    return inventoryLogsRepository.findAll(env, query);
  },
};