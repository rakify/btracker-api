import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timing } from 'hono/timing';

import { CORS_ORIGINS } from './config/constants.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { permissionsRoutes } from './modules/permissions/permissions.routes.js';
import { productsRoutes } from './modules/products/products.routes.js';
import { storesRoutes } from './modules/stores/stores.routes.js';
import { customersRoutes } from './modules/customers/customers.routes.js';
import { customerTransactionsRoutes } from './modules/customer-transactions/customer-transactions.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { walletsRoutes } from './modules/wallets/wallets.routes.js';
import { activityLogsRoutes } from './modules/activity-logs/activity-logs.routes.js';
import { inventoryLogsRoutes } from './modules/inventory-logs/inventory-logs.routes.js';
import { invitationsRoutes } from './modules/invitations/invitations.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { membersRoutes } from './modules/members/members.routes.js';
import { draftOrdersRoutes } from './modules/draft-orders/draft-orders.routes.js';

import { authMiddleware, type AuthBindings } from './middlewares/auth.middleware.js';

export type Env = AuthBindings & {
  DATABASE_URL: string;
};

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.use('*', logger());
  app.use('*', timing());
  app.use(
    '*',
    cors({
      origin: CORS_ORIGINS,
      credentials: true,
    })
  );

  app.get('/health', c =>
    c.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: Date.now(),
      },
    })
  );

  // Webhook routes (no auth needed)
  app.route('/webhooks', webhooksRoutes);

  // Protected routes
  app.use('/api/*', authMiddleware);
  app.route('/api/auth', authRoutes);
  app.route('/api/permissions', permissionsRoutes);
  app.route('/api/products', productsRoutes);
  app.route('/api/stores', storesRoutes);
  app.route('/api/customers', customersRoutes);
  app.route('/api/customer-transactions', customerTransactionsRoutes);
  app.route('/api/dashboard', dashboardRoutes);
  app.route('/api/orders', ordersRoutes);
  app.route('/api/roles', rolesRoutes);
  app.route('/api/wallets', walletsRoutes);
  app.route('/api/activity-logs', activityLogsRoutes);
  app.route('/api/inventory-logs', inventoryLogsRoutes);
  app.route('/api/invitations', invitationsRoutes);
  app.route('/api/admin', adminRoutes);
  app.route('/api/members', membersRoutes);
  app.route('/api/draft-orders', draftOrdersRoutes);

  app.notFound(c => c.json({ success: false, error: 'NotFound', message: 'Route not found' }, 404));

  return app;
}

export default createApp;
