import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';

import { authRoutes } from './modules/auth/auth.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { storesRoutes } from './modules/stores/stores.routes.js';
import { customersRoutes } from './modules/customers/customers.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { walletsRoutes } from './modules/wallets/wallets.routes.js';
import { activityLogsRoutes } from './modules/activity-logs/activity-logs.routes.js';
import { inventoryLogsRoutes } from './modules/inventory-logs/inventory-logs.routes.js';
import { invitationsRoutes } from './modules/invitations/invitations.routes.js';

import { authMiddleware, type AuthBindings } from './middlewares/auth.middleware.js';

export type Env = AuthBindings & {
  DATABASE_URL: string;
};

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use('*', logger());
  app.use('*', timing());
  app.use('*', cors({
    origin: ['http://localhost:8081', 'https://btracker-mobile.vercel.app', 'exp://*'],
    credentials: true,
  }));

  app.get('/health', (c) => c.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: Date.now(),
    },
  }));

  // Protected routes
  app.use('/api/*', authMiddleware);
  app.route('/api/auth', authRoutes);
  app.route('/api/products', productsRoutes);
  app.route('/api/stores', storesRoutes);
  app.route('/api/customers', customersRoutes);
  app.route('/api/orders', ordersRoutes);
  app.route('/api/roles', rolesRoutes);
  app.route('/api/wallets', walletsRoutes);
  app.route('/api/activity-logs', activityLogsRoutes);
  app.route('/api/inventory-logs', inventoryLogsRoutes);
  app.route('/api/invitations', invitationsRoutes);

  app.notFound((c) => c.json({ success: false, error: 'NotFound', message: 'Route not found' }, 404));

  return app;
}

export default createApp;