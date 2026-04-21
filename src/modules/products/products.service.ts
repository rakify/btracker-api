import { productsRepository } from './products.repository.js';
import type { CreateProductInput, UpdateProductInput, ProductQuery } from './products.validators.js';
import type { Env } from '../../config/env.js';

export const productsService = {
  async create(env: Env, data: CreateProductInput) {
    return productsRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return productsRepository.findById(env, id);
  },

  async update(env: Env, id: string, data: UpdateProductInput) {
    return productsRepository.update(env, id, data);
  },

  async delete(env: Env, id: string) {
    return productsRepository.delete(env, id);
  },

  async findAll(env: Env, query: ProductQuery) {
    return productsRepository.findAll(env, query);
  },

  async batchCreate(env: Env, storeId: string, createdBy: string, productList: Array<{
    name: string;
    description?: string;
    price: number;
    inventory?: number;
    allowPreOrder?: boolean;
    acceptCommission?: boolean;
    isCustom?: boolean;
    tags?: string[];
  }>) {
    return productsRepository.batchCreate(env, storeId, createdBy, productList);
  },
};