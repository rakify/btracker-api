import { customerTransactionsRepository } from './customer-transactions.repository.js';
import type { CustomerTransactionsQuery } from './customer-transactions.validators.js';
import type { Env } from '../../config/env.js';

export const customerTransactionsService = {
  async findByCustomerId(env: Env, query: CustomerTransactionsQuery) {
    return customerTransactionsRepository.findByCustomerId(env, query);
  },
};