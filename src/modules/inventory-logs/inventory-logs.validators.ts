import { z } from 'zod';

export const createInventoryLogSchema = z.object({
  storeId: z.string().uuid(),
  type: z.string().default('order'),
  productId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  userId: z.string().optional(),
  quantityChanged: z.number().or(z.string()),
  previousQuantity: z.number().or(z.string()),
  newQuantity: z.number().or(z.string()),
  priceAtTransaction: z.number().or(z.string()).optional(),
  commissionAmount: z.number().or(z.string()).optional(),
  note: z.string().optional(),
});

export const inventoryLogQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  type: z.string().optional(),
});

export type CreateInventoryLogInput = z.infer<typeof createInventoryLogSchema>;
export type InventoryLogQuery = z.infer<typeof inventoryLogQuerySchema>;