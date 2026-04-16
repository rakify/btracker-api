import { z } from 'zod';

export const createRoleSchema = z.object({
  storeId: z.string().uuid().optional(),
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
  createdBy: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const roleQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid().optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type RoleQuery = z.infer<typeof roleQuerySchema>;