export interface Env {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  NODE_ENV: string;
}

export function getEnv(c: { env: Env }): Env {
  return c.env;
}
