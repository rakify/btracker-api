import { desc, eq, like, and, count, asc, gte, lte, isNotNull, isNull, ilike } from 'drizzle-orm';
import { getDb } from '../../db/client.js';
import { products } from '../../db/schema/index.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from './products.validators.js';
import type { Env } from '../../config/env.js';

export const productsRepository = {
  async create(env: Env, data: CreateProductInput) {
    const db = getDb(env);
    const now = new Date();
    const [product] = await db
      .insert(products)
      .values({
        id: crypto.randomUUID(),
        storeId: data.storeId,
        name: data.name,
        description: data.description,
        images: data.images,
        price: String(data.price),
        allowPreOrder: data.allowPreOrder,
        acceptCommission: data.acceptCommission,
        isCustom: data.isCustom,
        inventory: data.inventory,
        tags: data.tags,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
      })
      .returning();
    return product;
  },

  async findById(env: Env, id: string) {
    const db = getDb(env);
    return db.query.products.findFirst({
      where: eq(products.id, id),
    });
  },

  async update(env: Env, id: string, data: UpdateProductInput) {
    const db = getDb(env);
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.price !== undefined) updateData.price = String(data.price);
    if (data.allowPreOrder !== undefined) updateData.allowPreOrder = data.allowPreOrder;
    if (data.acceptCommission !== undefined) updateData.acceptCommission = data.acceptCommission;
    if (data.isCustom !== undefined) updateData.isCustom = data.isCustom;
    if (data.inventory !== undefined) updateData.inventory = data.inventory;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    const [product] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    return product;
  },

  async delete(env: Env, id: string) {
    const db = getDb(env);
    await db.update(products).set({ deletedAt: new Date() }).where(eq(products.id, id));
  },

  async batchCreate(env: Env, storeId: string, createdBy: string, productList: Array<{
    name: string;
    description?: string;
    price: number;
    inventory?: number;
    allowPreOrder?: boolean;
    acceptCommission?: boolean;
    isCustom?: boolean;
    tags?: string[];
  }>) {
    const db = getDb(env);
    const now = new Date();
    const results = [];
    for (const item of productList) {
      try {
        const [product] = await db
          .insert(products)
          .values({
            id: crypto.randomUUID(),
            storeId,
            name: item.name,
            description: item.description,
            price: String(item.price),
            allowPreOrder: item.allowPreOrder ?? false,
            acceptCommission: item.acceptCommission ?? false,
            isCustom: item.isCustom ?? false,
            inventory: item.inventory ?? 0,
            tags: item.tags,
            createdAt: now,
            updatedAt: now,
            createdBy,
          })
          .returning();
        results.push({ success: true, product });
      } catch (error) {
        results.push({ success: false, error });
      }
    }
    return results;
  },

  async findAll(env: Env, query: ProductQuery) {
    const db = getDb(env);
    const {
      page,
      limit,
      search,
      storeId,
      name,
      price_range,
      acceptCommission,
      isCustom,
      sort,
      status,
    } = query;
    const offset = (page - 1) * limit;

    const [column, order] = (sort?.split('.') as [
      keyof typeof products.$inferSelect | undefined,
      'asc' | 'desc' | undefined,
    ]) ?? ['createdAt', 'desc'];

    const [minPrice, maxPrice] = price_range?.split('-') ?? [];
    const acceptCommissionBool =
      acceptCommission !== undefined ? acceptCommission === 'true' : undefined;
    const isCustomBool = isCustom !== undefined ? isCustom === 'true' : undefined;

    const sortableColumns: Record<string, any> = {
      name: products.name,
      price: products.price,
      inventory: products.inventory,
      createdAt: products.createdAt,
    };

    const safeColumn =
      column && sortableColumns[column] ? sortableColumns[column] : products.createdAt;

    const whereConditions = [
      storeId ? eq(products.storeId, storeId) : undefined,
      name ? ilike(products.name, `%${name}%`) : undefined,
      minPrice ? gte(products.price, minPrice) : undefined,
      maxPrice ? lte(products.price, maxPrice) : undefined,
      acceptCommissionBool !== undefined
        ? eq(products.acceptCommission, acceptCommissionBool)
        : undefined,
      isCustomBool !== undefined ? eq(products.isCustom, isCustomBool) : undefined,
      status === 'deleted'
        ? isNotNull(products.deletedAt)
        : status === 'active'
          ? isNull(products.deletedAt)
          : undefined,
    ].filter(Boolean);

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : eq(products.storeId, storeId);

    const [data, totalResult] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          description: products.description,
          price: products.price,
          inventory: products.inventory,
          acceptCommission: products.acceptCommission,
          allowPreOrder: products.allowPreOrder,
          createdAt: products.createdAt,
          deletedAt: products.deletedAt,
          createdBy: products.createdBy,
          deletedBy: products.deletedBy,
        })
        .from(products)
        .where(whereClause)
        .orderBy(order === 'asc' ? asc(safeColumn) : desc(safeColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count(products.id) })
        .from(products)
        .where(whereClause)
        .then(res => res[0]?.count ?? 0),
    ]);

    return {
      data,
      total: totalResult,
    };
  },
};
