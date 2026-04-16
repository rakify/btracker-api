import type { Context } from 'hono';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(c: Context, data: T, message?: string) {
  return c.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(c: Context, status: number, error: string, message?: string) {
  return c.json(
    {
      success: false,
      error,
      message,
    },
    status as any
  );
}

export function paginatedResponse<T>(
  c: Context,
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return c.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}