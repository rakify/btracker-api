import { customersRepository } from './customers.repository.js';
import type { CreateCustomerInput, UpdateCustomerInput, CustomerQuery, CustomerOrdersQuery } from './customers.validators.js';
import type { Env } from '../../config/env.js';

export const customersService = {
  async create(env: Env, data: CreateCustomerInput) {
    return customersRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return customersRepository.findById(env, id);
  },

  async update(env: Env, id: string, data: UpdateCustomerInput) {
    return customersRepository.update(env, id, data);
  },

  async delete(env: Env, id: string) {
    return customersRepository.delete(env, id);
  },

  async findAll(env: Env, query: CustomerQuery) {
    return customersRepository.findAll(env, query);
  },

  async findByIdWithStatus(env: Env, id: string, storeId: string, status?: 'active' | 'deleted' | 'all') {
    return customersRepository.findByIdWithStatus(env, id, storeId, status);
  },

  async findCustomerOrders(env: Env, query: CustomerOrdersQuery) {
    return customersRepository.findCustomerOrders(env, query);
  },
};