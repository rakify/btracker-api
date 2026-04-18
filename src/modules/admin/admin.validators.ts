import { z } from 'zod';

export const createAdminRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().min(1, 'Role is required'),
  permissions: z.record(z.boolean()).optional(),
});

export const updateAdminRoleSchema = z.object({
  role: z.string().min(1, 'Role is required').optional(),
  permissions: z.record(z.boolean()).optional(),
});

export const storeActionSchema = z.object({
  storeId: z.string().min(1, 'Store ID is required'),
});

export type CreateAdminRoleInput = z.infer<typeof createAdminRoleSchema>;
export type UpdateAdminRoleInput = z.infer<typeof updateAdminRoleSchema>;
export type StoreActionInput = z.infer<typeof storeActionSchema>;
