import { z } from 'zod';

export const createWalletSchema = z.object({
  storeId: z.string().uuid(),
  balance: z.number().or(z.string()).default(0),
  createdBy: z.string().optional(),
});

export const walletQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type WalletQuery = z.infer<typeof walletQuerySchema>;