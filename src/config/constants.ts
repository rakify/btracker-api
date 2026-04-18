export const APP_NAME = 'btracker-api';
export const APP_VERSION = '1.0.0';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const CORS_ORIGINS = [
  'http://localhost:8081',
  'https://btracker-mobile.vercel.app',
  'exp://*',
  'https://grizmocradle.com',
  'https://www.grizmocradle.com',
];

export const STOCK_MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER',
  ADJUSTMENT: 'ADJUSTMENT',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
