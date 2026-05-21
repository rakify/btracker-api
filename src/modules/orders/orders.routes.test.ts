import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { ordersRoutes } from './orders.routes.js';
import { ordersService } from './orders.service.js';

vi.mock('./orders.service.js', () => ({
  ordersService: {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
    getLatestEntryNo: vi.fn(),
  },
}));

// ─── Test app with auth injected ─────────────────────────────────────────────

function buildApp(authUserId = 'user-123') {
  const app = new Hono<{ Bindings: { DATABASE_URL: string } }>();
  // Inject auth context before routes run (mirrors what authMiddleware does)
  app.use('*', async (c, next) => {
    c.set('auth' as any, { userId: authUserId, clerkUserId: 'clerk-user-123' });
    await next();
  });
  app.route('/', ordersRoutes);
  return app;
}

function buildUnauthApp() {
  const app = new Hono();
  app.route('/', ordersRoutes);
  return app;
}

const STORE_ID = '00000000-0000-0000-0000-000000000001';
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000002';
const PRODUCT_ID = '00000000-0000-0000-0000-000000000003';
const ORDER_ID = '00000000-0000-0000-0000-000000000099';

const validOrderBody = {
  customerId: CUSTOMER_ID,
  entryNo: 7,
  primaryCost: '180',
  totalCostWithCommission: '200',
  totalCostWithoutCommission: '100',
  costAfterCommission: '180',
  commissionPercentage: '10',
  commissionValue: '20',
  previousReserve: '500',
  currentReserve: '100',
  finalReserve: '420',
  products: {
    [PRODUCT_ID]: {
      name: 'Widget A',
      price: '100',
      quantity: '2',
      returnedQuantity: '0',
      acceptCommission: true,
      allowPreOrder: false,
    },
  },
};

const mockOrder = {
  id: ORDER_ID,
  storeId: STORE_ID,
  customerId: CUSTOMER_ID,
  entryNo: 7,
  primaryCost: '180',
  totalCostWithCommission: '200',
  totalCostWithoutCommission: '100',
  costAfterCommission: '180',
  commissionPercentage: '10',
  commissionValue: '20',
  previousReserve: '500',
  currentReserve: '100',
  finalReserve: '420',
  createdBy: 'user-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an order and returns 200 with data', async () => {
    (ordersService.create as any).mockResolvedValue(mockOrder);
    const app = buildApp();

    const res = await app.request(`/?storeId=${STORE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.id).toBe(ORDER_ID);
    expect(ordersService.create).toHaveBeenCalledTimes(1);
  });

  it('passes createdBy from auth context to service', async () => {
    (ordersService.create as any).mockResolvedValue(mockOrder);
    const app = buildApp('auth-user-456');

    await app.request(`/?storeId=${STORE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    const callArg = (ordersService.create as any).mock.calls[0][1];
    expect(callArg.createdBy).toBe('auth-user-456');
  });

  it('returns 401 when no auth context is present', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/?storeId=${STORE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    expect(res.status).toBe(401);
    const json = await res.json() as any;
    expect(json.success).toBe(false);
  });

  it('returns 400 when storeId is missing from query', async () => {
    const app = buildApp();

    const res = await app.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.success).toBe(false);
    expect(ordersService.create).not.toHaveBeenCalled();
  });

  it('returns 400 when customerId is missing from body', async () => {
    const app = buildApp();
    const { customerId: _, ...bodyWithoutCustomer } = validOrderBody;

    const res = await app.request(`/?storeId=${STORE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithoutCustomer),
    });

    expect(res.status).toBe(400);
    expect(ordersService.create).not.toHaveBeenCalled();
  });

  it('returns 400 when service throws', async () => {
    (ordersService.create as any).mockRejectedValue(new Error('Inventory too low'));
    const app = buildApp();

    const res = await app.request(`/?storeId=${STORE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validOrderBody),
    });

    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.message).toBe('Inventory too low');
  });
});

describe('GET /orders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated orders list', async () => {
    (ordersService.findAll as any).mockResolvedValue({ data: [mockOrder], total: 1 });
    const app = buildApp();

    const res = await app.request(`/?storeId=${STORE_ID}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.data).toHaveLength(1);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/?storeId=${STORE_ID}`, { method: 'GET' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when storeId is missing', async () => {
    const app = buildApp();

    const res = await app.request('/', { method: 'GET' });

    expect(res.status).toBe(400);
    expect(ordersService.findAll).not.toHaveBeenCalled();
  });

  it('forwards pagination query params to service', async () => {
    (ordersService.findAll as any).mockResolvedValue({ data: [], total: 0 });
    const app = buildApp();

    await app.request(`/?storeId=${STORE_ID}&page=3&limit=5`, { method: 'GET' });

    const callArg = (ordersService.findAll as any).mock.calls[0][1];
    expect(callArg.page).toBe(3);
    expect(callArg.limit).toBe(5);
    expect(callArg.storeId).toBe(STORE_ID);
  });
});

describe('GET /orders/latest-entry-no', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the latest entry number', async () => {
    (ordersService.getLatestEntryNo as any).mockResolvedValue(15);
    const app = buildApp();

    const res = await app.request(`/latest-entry-no?storeId=${STORE_ID}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.latestEntryNo).toBe(15);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/latest-entry-no?storeId=${STORE_ID}`, {
      method: 'GET',
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when storeId is missing', async () => {
    const app = buildApp();

    const res = await app.request('/latest-entry-no', { method: 'GET' });

    expect(res.status).toBe(400);
  });
});

describe('GET /orders/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the order by id', async () => {
    (ordersService.findById as any).mockResolvedValue(mockOrder);
    const app = buildApp();

    const res = await app.request(`/${ORDER_ID}`, { method: 'GET' });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.id).toBe(ORDER_ID);
  });

  it('returns 404 when order does not exist', async () => {
    (ordersService.findById as any).mockResolvedValue(null);
    const app = buildApp();

    const res = await app.request(`/${ORDER_ID}`, { method: 'GET' });

    expect(res.status).toBe(404);
    const json = await res.json() as any;
    expect(json.success).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/${ORDER_ID}`, { method: 'GET' });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /orders/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the order and returns success', async () => {
    const updated = { ...mockOrder, customerId: CUSTOMER_ID };
    (ordersService.update as any).mockResolvedValue(updated);
    const app = buildApp();

    const res = await app.request(`/${ORDER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: CUSTOMER_ID }),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/${ORDER_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: CUSTOMER_ID }),
    });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /orders/:id', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes the order and returns success', async () => {
    (ordersService.delete as any).mockResolvedValue(undefined);
    const app = buildApp();

    const res = await app.request(`/${ORDER_ID}`, { method: 'DELETE' });

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(ordersService.delete).toHaveBeenCalledTimes(1);
    const [, calledId] = (ordersService.delete as any).mock.calls[0];
    expect(calledId).toBe(ORDER_ID);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = buildUnauthApp();

    const res = await app.request(`/${ORDER_ID}`, { method: 'DELETE' });

    expect(res.status).toBe(401);
  });
});
