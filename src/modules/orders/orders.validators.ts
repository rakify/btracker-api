import { z } from 'zod';

const numericSchema = z.number().or(z.string()).default(0);

export const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  entryNo: z.number().or(z.string()).optional(),
  primaryCost: numericSchema,
  totalCostWithCommission: numericSchema,
  totalCostWithoutCommission: numericSchema,
  costAfterCommission: numericSchema,
  commissionPercentage: numericSchema,
  commissionValue: numericSchema,
  previousReserve: numericSchema,
  currentReserve: numericSchema,
  finalReserve: numericSchema,
  products: z.record(
    z.string().uuid(),
    z.object({
      productId: z.string().uuid().optional(),
      name: z.string(),
      price: numericSchema,
      quantity: numericSchema,
      returnedQuantity: numericSchema,
      acceptCommission: z.boolean().default(false),
      allowPreOrder: z.boolean().default(false),
      inventory: numericSchema.optional(),
    })
  ),
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

export const latestEntryNoQuerySchema = z.object({
  storeId: z.string().uuid(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;