import { dashboardRepository } from './dashboard.repository.js';
import type { DashboardQuery } from './dashboard.validators.js';
import type { Env } from '../../config/env.js';

export const dashboardService = {
  async getDashboardData(env: Env, query: DashboardQuery) {
    return dashboardRepository.getDashboardData(env, query);
  },
};