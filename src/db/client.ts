import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema/index.js';

declare global {
  var __db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __dbUrl: string | undefined;
}

function createDbClient(databaseUrl: string) {
  if (!globalThis.__db || globalThis.__dbUrl !== databaseUrl) {
    const client = neon(databaseUrl);
    globalThis.__db = drizzle(client, { schema });
    globalThis.__dbUrl = databaseUrl;
  }
  return globalThis.__db;
}

export function getDb(env: { DATABASE_URL?: string } = {}) {
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  return createDbClient(url);
}

export { schema };
export * from './schema/index.js';
