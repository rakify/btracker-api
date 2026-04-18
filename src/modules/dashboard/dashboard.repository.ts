import { eq, and, count, sum, isNull, desc, inArray } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { stores, products, orders, customers, activityLogs } from '../../db/schema/index.js';
import type { DashboardQuery } from './dashboard.validators.js';
import type { Env } from '../../config/env.js';

export const dashboardRepository = {
  async getDashboardData(env: Env, query: DashboardQuery) {
    const db = getDb(env);
    const { userId } = query;

    // Get all stores the user has access to
    const userStores = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.userId, userId), isNull(stores.deletedAt)));

    const storeIds = userStores.map((store) => store.id);

    if (storeIds.length === 0) {
      return {
        metrics: {
          totalStores: 0,
          totalProducts: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCustomers: 0,
        },
        recentActivity: [],
        stores: [],
      };
    }

    // Parallel fetch all dashboard data
    const [
      storeCount,
      productCount,
      orderData,
      customerCount,
      recentActivity,
      storesData,
    ] = await Promise.all([
      // Metrics queries
      db
        .select({ count: count() })
        .from(stores)
        .where(and(inArray(stores.id, storeIds), isNull(stores.deletedAt))),
      db
        .select({ count: count() })
        .from(products)
        .where(inArray(products.storeId, storeIds)),
      db
        .select({
          count: count(),
          revenue: sum(orders.totalCostWithCommission),
        })
        .from(orders)
        .where(inArray(orders.storeId, storeIds)),
      db
        .select({ count: count() })
        .from(customers)
        .where(inArray(customers.storeId, storeIds)),

      // Recent activity (limit 10)
      db
        .select({
          id: activityLogs.id,
          action: activityLogs.action,
          trackableType: activityLogs.trackableType,
          trackableId: activityLogs.trackableId,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt,
          store: {
            id: stores.id,
            name: stores.name,
          },
        })
        .from(activityLogs)
        .leftJoin(stores, eq(activityLogs.storeId, stores.id))
        .where(inArray(activityLogs.storeId, storeIds))
        .orderBy(desc(activityLogs.createdAt))
        .limit(10),

      // User stores for overview
      db
        .selectDistinct({
          id: stores.id,
          name: stores.name,
          slug: stores.slug,
          active: stores.active,
          description: stores.description,
        })
        .from(stores)
        .leftJoin(products, eq(products.storeId, stores.id))
        .where(and(eq(stores.userId, userId), isNull(stores.deletedAt)))
        .groupBy(stores.id),
    ]);

    return {
      metrics: {
        totalStores: storeCount[0]?.count ?? 0,
        totalProducts: productCount[0]?.count ?? 0,
        totalOrders: orderData[0]?.count ?? 0,
        totalRevenue: Number(orderData[0]?.revenue ?? 0),
        totalCustomers: customerCount[0]?.count ?? 0,
      },
      recentActivity: recentActivity.map((activity) => ({
        ...activity,
        createdAt: activity.createdAt.toISOString(),
      })),
      stores: storesData,
    };
  },
};