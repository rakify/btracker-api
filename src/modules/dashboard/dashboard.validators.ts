import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  userId: z.string().uuid(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;