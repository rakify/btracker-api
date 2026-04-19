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
  status: z.enum(['active', 'deleted', 'all']).default('active'),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
});

export const addBalanceSchema = z.object({
  storeId: z.string().uuid(),
  amount: z.number().or(z.string()),
  note: z.string().optional(),
});

export const customerOrdersQuerySchema = z.object({
  page: z.number().default(1),
  per_page: z.number().default(10),
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional(),
  createdBy: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
export type CustomerOrdersQuery = z.infer<typeof customerOrdersQuerySchema>;