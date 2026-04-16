import { activityLogsRepository } from './activity-logs.repository.js';
import type { CreateActivityLogInput, ActivityLogQuery } from './activity-logs.validators.js';
import type { Env } from '../../config/env.js';

export const activityLogsService = {
  async create(env: Env, data: CreateActivityLogInput) {
    return activityLogsRepository.create(env, data);
  },

  async findById(env: Env, id: string) {
    return activityLogsRepository.findById(env, id);
  },

  async findAll(env: Env, query: ActivityLogQuery) {
    return activityLogsRepository.findAll(env, query);
  },
};