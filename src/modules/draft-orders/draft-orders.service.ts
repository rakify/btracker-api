import { type Env } from '../../config/env.js';
import { draftOrdersRepository } from './draft-orders.repository.js';
import type { SaveDraftOrderInput } from './draft-orders.validators.js';

export const draftOrdersService = {
  async save(
    env: Env,
    input: SaveDraftOrderInput
  ): Promise<{ draftOrderId: string | null; status: 'saved' | 'no_products' | 'identical' }> {
    const { storeId, customerId, userId, products } = input;

    const productEntries = Object.entries(products);
    if (productEntries.length === 0) {
      await draftOrdersRepository.deleteByCustomerId(env, storeId, customerId, userId);
      return {
        draftOrderId: null,
        status: 'no_products',
      };
    }

    const { draftOrder, isIdentical } = await draftOrdersRepository.upsertWithProducts(
      env,
      storeId,
      customerId,
      userId,
      products
    );

    if (isIdentical) {
      return {
        draftOrderId: draftOrder!.id,
        status: 'identical',
      };
    }

    return {
      draftOrderId: draftOrder!.id,
      status: 'saved',
    };
  },

  async findByCustomerId(
    env: Env,
    storeId: string,
    customerId: string,
    userId: string
  ) {
    const draftOrder = await draftOrdersRepository.findByCustomerId(env, storeId, customerId, userId);
    if (!draftOrder) return null;

    const products = await draftOrdersRepository.getProducts(env, draftOrder.id);

    return {
      ...draftOrder,
      products: products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
      })),
    };
  },

  async delete(env: Env, draftOrderId: string): Promise<boolean> {
    return draftOrdersRepository.delete(env, draftOrderId);
  },

  async clearByCustomerId(
    env: Env,
    storeId: string,
    customerId: string,
    userId: string
  ): Promise<boolean> {
    return draftOrdersRepository.deleteByCustomerId(env, storeId, customerId, userId);
  },

  async findAllByStore(env: Env, storeId: string) {
    return draftOrdersRepository.findAllByStore(env, storeId);
  },
};