import { Hono } from 'hono';
import { getDb } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { Env } from '../../config/env.js';
import { errorResponse, successResponse } from '../../lib/response.js';
import { Webhook } from 'svix';

export const webhooksRoutes = new Hono<{ Bindings: Env }>();

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string; verification?: { status: string } }[];
    primary_email_address_id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    username?: string;
    image_url?: string;
    public_metadata?: Record<string, unknown>;
    private_metadata?: Record<string, unknown>;
    unsafe_metadata?: Record<string, unknown>;
    phone_numbers?: { phone_number: string; verification?: { status: string } }[];
    password_enabled?: boolean;
    two_factor_enabled?: boolean;
    banned?: boolean;
    created_at?: number;
    updated_at?: number;
    last_sign_in_at?: number;
    external_accounts?: { provider: string; email?: string }[];
    deleted?: boolean;
  };
}

webhooksRoutes.post('/clerk', async (c) => {
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return errorResponse(c, 500, 'ServerError', 'Webhook secret not configured');
  }

  const body = await c.req.text();
  const svixId = c.req.header('svix-id');
  const svixTimestamp = c.req.header('svix-timestamp');
  const svixSignature = c.req.header('svix-signature');

  if (!svixSignature) {
    return errorResponse(c, 401, 'Unauthorized', 'Missing svix-signature header');
  }

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(body, {
      'svix-id': svixId || '',
      'svix-timestamp': svixTimestamp || '',
      'svix-signature': svixSignature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return errorResponse(c, 401, 'Unauthorized', 'Invalid webhook signature');
  }

  let payload: ClerkWebhookPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return errorResponse(c, 400, 'BadRequest', 'Invalid JSON payload');
  }

  const { type, data } = payload;
  const db = getDb(c.env);

  try {
    switch (type) {
      case 'user.created': {
        const emailEntry = data.email_addresses?.[0];
        const email = emailEntry?.email_address?.trim() || null;
        const emailVerified = emailEntry?.verification?.status === 'verified';
        const phoneEntry = data.phone_numbers?.[0];
        const phoneNumber = phoneEntry?.phone_number || null;
        const signUpMethod = data.external_accounts?.[0]?.provider || 'email';

        await db.insert(users).values({
          id: crypto.randomUUID(),
          clerkUserId: data.id,
          email,
          emailVerified,
          name: data.first_name && data.last_name
            ? `${data.first_name} ${data.last_name}`
            : data.name || 'User',
          avatarUrl: data.image_url || null,
          username: data.username || null,
          phoneNumber,
          signUpMethod,
          passwordEnabled: data.password_enabled || false,
          twoFactorEnabled: data.two_factor_enabled || false,
          banned: data.banned || false,
          publicMetadata: data.public_metadata || {},
          lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
          createdAt: new Date(data.created_at || Date.now()),
          updatedAt: new Date(data.updated_at || Date.now()),
        }).onConflictDoNothing();

        break;
      }

      case 'user.updated': {
        const primaryEmail = data.email_addresses?.[0]?.email_address;
        const email = primaryEmail === '' || primaryEmail === undefined ? null : primaryEmail;
        const emailVerified = data.email_addresses?.[0]?.verification?.status === 'verified';
        const phoneNumber = data.phone_numbers?.[0]?.phone_number || null;

        await db.update(users)
          .set({
            email,
            emailVerified,
            name: data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`
              : data.name || null,
            avatarUrl: data.image_url || null,
            username: data.username || null,
            phoneNumber,
            passwordEnabled: data.password_enabled,
            twoFactorEnabled: data.two_factor_enabled,
            banned: data.banned,
            publicMetadata: data.public_metadata || {},
            lastSignInAt: data.last_sign_in_at ? new Date(data.last_sign_in_at) : null,
            updatedAt: new Date(data.updated_at || Date.now()),
          })
          .where(eq(users.clerkUserId, data.id));

        break;
      }

      case 'user.deleted': {
        await db.delete(users)
          .where(eq(users.clerkUserId, data.id));

        break;
      }

      case 'session.created': {
        await db.update(users)
          .set({
            lastSignInAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.clerkUserId, data.id));

        break;
      }

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return successResponse(c, { received: true }, 'Webhook processed');
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to process webhook');
  }
});