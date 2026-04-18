import { z } from 'zod';

export const customerTransactionsQuerySchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
});

export type CustomerTransactionsQuery = z.infer<typeof customerTransactionsQuerySchema>;