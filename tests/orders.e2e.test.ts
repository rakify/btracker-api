/**
 * E2E test for the full add-order flow.
 *
 * Strategy:
 *  - Seeds a real user, store, customer, and two products directly in the DB.
 *  - Builds a fake JWT (the auth middleware only base64-decodes it; it does NOT
 *    verify the signature).  The fake token's `sub` claim matches the seeded
 *    user's clerkUserId so the middleware resolves the auth context correctly.
 *  - Hits the full Hono app via `app.fetch()` with the DATABASE_URL env binding.
 *  - Queries the DB directly to assert every side-effect: order row, order
 *    products rows, inventory decrement, and inventory log.
 *  - Cleans up all seeded rows in afterAll — including any orders created
 *    during the test run — regardless of test outcome.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, inArray } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import * as schema from '../src/db/schema/index.js';
import { createApp } from '../src/app.js';

// ─── Env ─────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

const ENV = {
  DATABASE_URL,
  CLERK_WEBHOOK_SECRET: 'e2e-test-secret',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'test',
};

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const CLERK_USER_ID = `e2e_test_${crypto.randomUUID()}`;
const USER_ID = crypto.randomUUID();
const STORE_ID = crypto.randomUUID();
const CUSTOMER_ID = crypto.randomUUID();
const PRODUCT_A_ID = crypto.randomUUID(); // accepts commission, inventory = 20
const PRODUCT_B_ID = crypto.randomUUID(); // no commission,   inventory = 10
const PREORDER_PRODUCT_ID = crypto.randomUUID(); // allowPreOrder = true

const INITIAL_INVENTORY_A = 20;
const INITIAL_INVENTORY_B = 10;
const INITIAL_CUSTOMER_BALANCE = '1000.00';

// ─── DB client (direct, bypasses Hono) ───────────────────────────────────────

const db = drizzle(neon(DATABASE_URL), { schema });

// ─── JWT helper ──────────────────────────────────────────────────────────────

/**
 * Produces a three-part JWT whose payload contains `{"sub": clerkUserId}`.
 * The signature segment is fake — the auth middleware never verifies it,
 * it only base64-decodes the header and payload to read `sub`.
 */
function makeFakeJWT(clerkUserId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({ sub: clerkUserId })).toString('base64');
  return `${header}.${payload}.e2e_fake_signature`;
}

// ─── Seed & teardown ─────────────────────────────────────────────────────────

async function seed() {
  await db.insert(schema.users).values({
    id: USER_ID,
    clerkUserId: CLERK_USER_ID,
    name: 'E2E Test User',
    email: `e2e-test-${USER_ID}@example.com`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(schema.stores).values({
    id: STORE_ID,
    userId: USER_ID,
    name: 'E2E Test Store',
    slug: `e2e-test-store-${STORE_ID}`,
    currencySymbol: '৳',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: USER_ID,
  });

  await db.insert(schema.customers).values({
    id: CUSTOMER_ID,
    storeId: STORE_ID,
    name: 'E2E Test Customer',
    balance: INITIAL_CUSTOMER_BALANCE,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: USER_ID,
  });

  await db.insert(schema.products).values([
    {
      id: PRODUCT_A_ID,
      storeId: STORE_ID,
      name: 'Product A (commission)',
      price: '100.00',
      inventory: INITIAL_INVENTORY_A,
      acceptCommission: true,
      allowPreOrder: false,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: USER_ID,
    },
    {
      id: PRODUCT_B_ID,
      storeId: STORE_ID,
      name: 'Product B (no commission)',
      price: '50.00',
      inventory: INITIAL_INVENTORY_B,
      acceptCommission: false,
      allowPreOrder: false,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: USER_ID,
    },
    {
      id: PREORDER_PRODUCT_ID,
      storeId: STORE_ID,
      name: 'Pre-order Product',
      price: '200.00',
      inventory: 0,
      acceptCommission: false,
      allowPreOrder: true,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: USER_ID,
    },
  ]);
}

async function cleanup() {
  // Collect all order IDs that belong to the test store before deleting
  const testOrders = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .where(eq(schema.orders.storeId, STORE_ID));

  const orderIds = testOrders.map((o) => o.id);

  if (orderIds.length > 0) {
    await db
      .delete(schema.inventoryLogs)
      .where(inArray(schema.inventoryLogs.orderId, orderIds));

    await db
      .delete(schema.orderProducts)
      .where(inArray(schema.orderProducts.orderId, orderIds));

    await db.delete(schema.orders).where(eq(schema.orders.storeId, STORE_ID));
  }

  await db.delete(schema.products).where(eq(schema.products.storeId, STORE_ID));
  await db.delete(schema.customers).where(eq(schema.customers.storeId, STORE_ID));
  await db.delete(schema.stores).where(eq(schema.stores.id, STORE_ID));
  await db.delete(schema.users).where(eq(schema.users.id, USER_ID));
}

// ─── App & token ─────────────────────────────────────────────────────────────

const app = createApp();
const AUTH_TOKEN = makeFakeJWT(CLERK_USER_ID);

function makeRequest(path: string, body: unknown, method = 'POST'): Request {
  return new Request(`http://localhost/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
    body: method !== 'GET' ? JSON.stringify(body) : undefined,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Order E2E — full create flow', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await cleanup();
  });

  // ── Happy path: mixed products ─────────────────────────────────────────────

  it('creates order + order_products + decrements inventory + writes inventory log', async () => {
    const QTY_A = 3;
    const QTY_B = 2;
    // Product A: 100 * 3 = 300 (accepts commission)
    // Product B: 50  * 2 = 100 (no commission)
    // commission 10% on A: 30
    // costAfterCommission: 270
    // primaryCost: 270 + 100 = 370
    // finalReserve: 1000 + 0 - 370 = 630
    const body = {
      customerId: CUSTOMER_ID,
      entryNo: 1,
      primaryCost: '370',
      totalCostWithCommission: '300',
      totalCostWithoutCommission: '100',
      costAfterCommission: '270',
      commissionPercentage: '10',
      commissionValue: '30',
      previousReserve: '1000',
      currentReserve: '0',
      finalReserve: '630',
      products: {
        [PRODUCT_A_ID]: {
          name: 'Product A (commission)',
          price: '100',
          quantity: String(QTY_A),
          returnedQuantity: '0',
          acceptCommission: true,
          allowPreOrder: false,
        },
        [PRODUCT_B_ID]: {
          name: 'Product B (no commission)',
          price: '50',
          quantity: String(QTY_B),
          returnedQuantity: '0',
          acceptCommission: false,
          allowPreOrder: false,
        },
      },
    };

    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, body),
      ENV,
    );

    // ── HTTP response ──
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    const orderId: string = json.data.id;
    expect(orderId).toBeTruthy();

    // ── Order row ──
    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    expect(order).toBeDefined();
    expect(order.storeId).toBe(STORE_ID);
    expect(order.customerId).toBe(CUSTOMER_ID);
    expect(order.entryNo).toBe(1);
    expect(Number(order.primaryCost)).toBeCloseTo(370, 1);
    expect(Number(order.totalCostWithCommission)).toBeCloseTo(300, 1);
    expect(Number(order.totalCostWithoutCommission)).toBeCloseTo(100, 1);
    expect(Number(order.costAfterCommission)).toBeCloseTo(270, 1);
    expect(Number(order.commissionPercentage)).toBeCloseTo(10, 1);
    expect(Number(order.commissionValue)).toBeCloseTo(30, 1);
    expect(Number(order.previousReserve)).toBeCloseTo(1000, 1);
    expect(Number(order.currentReserve)).toBeCloseTo(0, 1);
    expect(Number(order.finalReserve)).toBeCloseTo(630, 1);
    expect(order.createdBy).toBe(USER_ID);

    // ── Order products ──
    const orderItems = await db
      .select()
      .from(schema.orderProducts)
      .where(eq(schema.orderProducts.orderId, orderId));

    expect(orderItems).toHaveLength(2);

    const itemA = orderItems.find((i) => i.productId === PRODUCT_A_ID);
    const itemB = orderItems.find((i) => i.productId === PRODUCT_B_ID);

    expect(itemA).toBeDefined();
    expect(Number(itemA!.quantity)).toBe(QTY_A);
    expect(Number(itemA!.price)).toBeCloseTo(100, 1);
    expect(itemA!.acceptCommission).toBe(true);

    expect(itemB).toBeDefined();
    expect(Number(itemB!.quantity)).toBe(QTY_B);
    expect(Number(itemB!.price)).toBeCloseTo(50, 1);
    expect(itemB!.acceptCommission).toBe(false);

    // ── Inventory decremented ──
    const [productA] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, PRODUCT_A_ID));
    expect(productA.inventory).toBe(INITIAL_INVENTORY_A - QTY_A); // 17

    const [productB] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, PRODUCT_B_ID));
    expect(productB.inventory).toBe(INITIAL_INVENTORY_B - QTY_B); // 8

    // ── Inventory logs created ──
    const invLogs = await db
      .select()
      .from(schema.inventoryLogs)
      .where(eq(schema.inventoryLogs.orderId, orderId));

    expect(invLogs).toHaveLength(2);

    const logA = invLogs.find((l) => l.productId === PRODUCT_A_ID);
    expect(logA).toBeDefined();
    expect(logA!.type).toBe('sale');
    expect(Number(logA!.quantityChanged)).toBe(-QTY_A);
    expect(Number(logA!.previousQuantity)).toBe(INITIAL_INVENTORY_A);
    expect(Number(logA!.newQuantity)).toBe(INITIAL_INVENTORY_A - QTY_A);

    const logB = invLogs.find((l) => l.productId === PRODUCT_B_ID);
    expect(logB).toBeDefined();
    expect(Number(logB!.quantityChanged)).toBe(-QTY_B);
    expect(Number(logB!.previousQuantity)).toBe(INITIAL_INVENTORY_B);
    expect(Number(logB!.newQuantity)).toBe(INITIAL_INVENTORY_B - QTY_B);
  });

  // ── Pre-order product: inventory must NOT change ───────────────────────────

  it('does NOT decrement inventory for pre-order products', async () => {
    const body = {
      customerId: CUSTOMER_ID,
      entryNo: 2,
      primaryCost: '200',
      totalCostWithCommission: '0',
      totalCostWithoutCommission: '200',
      costAfterCommission: '0',
      commissionPercentage: '0',
      commissionValue: '0',
      previousReserve: '1000',
      currentReserve: '0',
      finalReserve: '800',
      products: {
        [PREORDER_PRODUCT_ID]: {
          name: 'Pre-order Product',
          price: '200',
          quantity: '1',
          returnedQuantity: '0',
          acceptCommission: false,
          allowPreOrder: true,
        },
      },
    };

    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, body),
      ENV,
    );
    expect(res.status).toBe(200);

    const [preorderProduct] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, PREORDER_PRODUCT_ID));

    // inventory stays at 0 — no decrement for pre-orders
    expect(preorderProduct.inventory).toBe(0);

    // no inventory log should be written for a pre-order
    const orderId = ((await res.json()) as any).data.id;
    const logs = await db
      .select()
      .from(schema.inventoryLogs)
      .where(eq(schema.inventoryLogs.orderId, orderId));
    expect(logs).toHaveLength(0);
  });

  // ── Zero-quantity products are silently skipped ────────────────────────────

  it('skips products with quantity 0 and creates no order_products row for them', async () => {
    const body = {
      customerId: CUSTOMER_ID,
      entryNo: 3,
      primaryCost: '100',
      totalCostWithCommission: '100',
      totalCostWithoutCommission: '0',
      costAfterCommission: '90',
      commissionPercentage: '10',
      commissionValue: '10',
      previousReserve: '1000',
      currentReserve: '0',
      finalReserve: '900',
      products: {
        [PRODUCT_A_ID]: {
          name: 'Product A (commission)',
          price: '100',
          quantity: '1',
          returnedQuantity: '0',
          acceptCommission: true,
          allowPreOrder: false,
        },
        [PRODUCT_B_ID]: {
          name: 'Product B (no commission)',
          price: '50',
          quantity: '0', // ← should be skipped
          returnedQuantity: '0',
          acceptCommission: false,
          allowPreOrder: false,
        },
      },
    };

    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, body),
      ENV,
    );
    expect(res.status).toBe(200);
    const orderId = ((await res.json()) as any).data.id;

    const items = await db
      .select()
      .from(schema.orderProducts)
      .where(eq(schema.orderProducts.orderId, orderId));

    // Only the product with qty > 0 gets a row
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe(PRODUCT_A_ID);
  });

  // ── GET latest-entry-no reflects seeded orders ─────────────────────────────

  it('GET /latest-entry-no returns the highest entryNo for the store', async () => {
    const res = await app.fetch(
      makeRequest(`/orders/latest-entry-no?storeId=${STORE_ID}`, null, 'GET'),
      ENV,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    // Three orders were created above with entryNo 1, 2, 3
    expect(json.data.latestEntryNo).toBeGreaterThanOrEqual(3);
  });

  // ── GET /orders returns the store's orders ─────────────────────────────────

  it('GET /orders returns all orders for the store', async () => {
    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, null, 'GET'),
      ENV,
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    // We created 3 orders above
    expect(json.data.data.length).toBeGreaterThanOrEqual(3);
  });

  // ── BUG: customer balance is never updated after order creation ───────────
  // The order stores finalReserve correctly, but btracker_customers.balance
  // is never written. The next order will read the stale balance as
  // previousReserve, causing incorrect financial tracking.

  it('BUG: customer balance should equal finalReserve after order (currently fails)', async () => {
    const body = {
      customerId: CUSTOMER_ID,
      entryNo: 99,
      primaryCost: '100',
      totalCostWithCommission: '100',
      totalCostWithoutCommission: '0',
      costAfterCommission: '90',
      commissionPercentage: '10',
      commissionValue: '10',
      previousReserve: '1000',
      currentReserve: '0',
      finalReserve: '900', // ← balance should become this after the order
      products: {
        [PRODUCT_A_ID]: {
          name: 'Product A (commission)',
          price: '100',
          quantity: '1',
          returnedQuantity: '0',
          acceptCommission: true,
          allowPreOrder: false,
        },
      },
    };

    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, body),
      ENV,
    );
    expect(res.status).toBe(200);

    const [customer] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.id, CUSTOMER_ID));

    // This assertion FAILS — balance stays at 1000.00 instead of being updated to 900
    expect(Number(customer.balance)).toBe(900);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ── Auth guard ─────────────────────────────────────────────────────────────

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request(
      `http://localhost/api/orders?storeId=${STORE_ID}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: CUSTOMER_ID }),
      },
    );
    const res = await app.fetch(req, ENV);
    expect(res.status).toBe(401);
  });

  // ── Validation guard ───────────────────────────────────────────────────────

  it('returns 400 when storeId query param is missing', async () => {
    const body = {
      customerId: CUSTOMER_ID,
      entryNo: 99,
      products: {},
    };
    const res = await app.fetch(makeRequest('/orders', body), ENV);
    expect(res.status).toBe(400);
  });

  it('returns 400 when customerId is not a valid UUID', async () => {
    const body = {
      customerId: 'not-a-uuid',
      entryNo: 99,
      products: {},
    };
    const res = await app.fetch(
      makeRequest(`/orders?storeId=${STORE_ID}`, body),
      ENV,
    );
    expect(res.status).toBe(400);
  });
});
