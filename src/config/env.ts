export interface Env {
  DATABASE_URL: string;
  CLERK_SECRET_KEY: string;
  CLERK_WEBHOOK_SECRET: string;
  NODE_ENV: string;
  INITIAL_SUPER_ADMIN_EMAIL?: string;
}

export function getEnv(c: { env: Env }): Env {
  return c.env;
}
