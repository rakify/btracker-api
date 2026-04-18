import { ordersRepository } from './orders.repository.js';
import type { CreateOrderInput, UpdateOrderInput, OrderQuery } from './orders.validators.js';
import type { Env } from '../../config/env.js';

export const ordersService = {
  async create(env: Env, data: CreateOrderInput) {
    return ordersRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return ordersRepository.findById(env, id);
  },

  async update(env: Env, id: string, data: UpdateOrderInput) {
    return ordersRepository.update(env, id, data);
  },

  async delete(env: Env, id: string) {
    return ordersRepository.delete(env, id);
  },

  async findAll(env: Env, query: OrderQuery) {
    return ordersRepository.findAll(env, query);
  },

  async getLatestEntryNo(env: Env, storeId: string) {
    return ordersRepository.getLatestEntryNo(env, storeId);
  },
};