import { z } from 'zod';

const numericSchema = z
  .union([z.string(), z.number()])
  .transform((v) => v.toString())
  .optional()
  .default('0');

export const saveDraftOrderSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  userId: z.string(),
  products: z.record(
    z.string().uuid(),
    z.object({
      quantity: numericSchema,
    })
  ),
});

export const draftOrderQuerySchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
});

export type SaveDraftOrderInput = z.infer<typeof saveDraftOrderSchema>;
export type DraftOrderQuery = z.infer<typeof draftOrderQuerySchema>;