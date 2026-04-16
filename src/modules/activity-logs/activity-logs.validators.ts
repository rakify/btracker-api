import { z } from 'zod';

export const createActivityLogSchema = z.object({
  storeId: z.string().uuid(),
  trackableType: z.string(),
  trackableId: z.string().uuid(),
  action: z.string(),
  createdBy: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const activityLogQuerySchema = z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
  storeId: z.string().uuid(),
  trackableType: z.string().optional(),
  action: z.string().optional(),
});

export type CreateActivityLogInput = z.infer<typeof createActivityLogSchema>;
export type ActivityLogQuery = z.infer<typeof activityLogQuerySchema>;