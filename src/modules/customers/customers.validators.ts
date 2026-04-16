import { z } from 'zod';

export const createCustomerSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  balance: z.number().or(z.string()).default(0),
  createdBy: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  balance: z.number().or(z.string()).optional(),
  updatedBy: z.string().optional(),
});

export const customerQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
  search: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;