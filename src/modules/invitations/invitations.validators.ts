import { z } from 'zod';

export const createInvitationSchema = z.object({
  storeId: z.string().uuid(),
  invitedEmail: z.string().email(),
  roleId: z.string().uuid().optional(),
  expiresAt: z.string().transform((val) => new Date(val)),
  createdBy: z.string().optional(),
});

export const updateInvitationSchema = z.object({
  status: z.enum(['pending', 'accepted', 'expired']).optional(),
  updatedBy: z.string().optional(),
});

export const invitationQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;
export type InvitationQuery = z.infer<typeof invitationQuerySchema>;