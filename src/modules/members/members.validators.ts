import { z } from 'zod';

export const membersQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  roleId: z.string().uuid(),
  updatedBy: z.string().optional(),
});

export type MembersQuery = z.infer<typeof membersQuerySchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;