import { z } from 'zod';

export const createProductSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  price: z.string().or(z.number()).default('0'),
  allowPreOrder: z.boolean().default(false),
  acceptCommission: z.boolean().default(false),
  isCustom: z.boolean().default(false),
  inventory: z.number().default(0),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  price: z.string().or(z.number()).optional(),
  allowPreOrder: z.boolean().optional(),
  acceptCommission: z.boolean().optional(),
  isCustom: z.boolean().optional(),
  inventory: z.number().optional(),
  tags: z.array(z.string()).optional(),
  updatedBy: z.string().optional(),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
  search: z.string().optional(),
  storeId: z.string().uuid(),
  name: z.string().optional(),
  price_range: z.string().optional(),
  acceptCommission: z.string().optional(),
  isCustom: z.string().optional(),
  sort: z.string().optional(),
  status: z.enum(['active', 'deleted', 'all']).default('active'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
