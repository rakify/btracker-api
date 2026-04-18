import { z } from 'zod';

export const createStoreSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  description: z.string().optional(),
  currencySymbol: z.string().optional().default('৳'),
});

export const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  currencySymbol: z.string().optional(),
  active: z.boolean().optional(),
});

export const storeQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  userId: z.string().optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type StoreQuery = z.infer<typeof storeQuerySchema>;