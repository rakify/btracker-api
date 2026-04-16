import { z } from 'zod';

export const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  products: z.array(z.object({
    productId: z.string().uuid().optional(),
    name: z.string(),
    price: z.number().or(z.string()),
    quantity: z.number().or(z.string()),
    returnedQuantity: z.number().or(z.string()).default(0),
    acceptCommission: z.boolean().default(false),
    allowPreOrder: z.boolean().default(false),
  })),
  createdBy: z.string().optional(),
});

export const updateOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  updatedBy: z.string().optional(),
});

export const orderQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;