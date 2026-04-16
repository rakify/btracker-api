import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function errorMiddleware(
  err: Error,
  c: Context
): Promise<Response> {
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: err.name,
        message: err.message,
      },
      err.status
    );
  }

  console.error('Unhandled error:', err);
  return c.json(
    {
      success: false,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    },
    500
  );
}