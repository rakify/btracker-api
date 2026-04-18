import { Hono } from 'hono';
import { getDb } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import type { Env } from '../../config/env.js';
import { errorResponse, successResponse } from '../../lib/response.js';

export const webhooksRoutes = new Hono<{ Bindings: Env }>();

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses: { email_address: string }[];
    primary_email_address_id: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    image_url?: string;
    public_metadata?: Record<string, unknown>;
    created_at?: number;
    updated_at?: number;
    deleted?: boolean;
  };
}

webhooksRoutes.post('/clerk', async (c) => {
  const webhookSecret = c.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return errorResponse(c, 500, 'ServerError', 'Webhook secret not configured');
  }

  const body = await c.req.text();
  const headerSignature = c.req.header('clerk-signature');

  if (!headerSignature) {
    return errorResponse(c, 401, 'Unauthorized', 'Missing clerk-signature header');
  }

  try {
    const verified = await verifyClerkWebhook(body, headerSignature, webhookSecret);
    if (!verified) {
      return errorResponse(c, 401, 'Unauthorized', 'Invalid webhook signature');
    }
  } catch (err) {
    return errorResponse(c, 401, 'Unauthorized', 'Failed to verify webhook');
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
        const primaryEmail = data.email_addresses.find(
          (e) => e.email_address === data.email_addresses[0]?.email_address
        )?.email_address || null;

        await db.insert(users).values({
          id: data.id,
          clerkUserId: data.id,
          email: primaryEmail,
          name: data.first_name && data.last_name
            ? `${data.first_name} ${data.last_name}`
            : data.name || 'User',
          emailVerified: true,
          image: data.image_url || null,
          createdAt: new Date(data.created_at || Date.now()),
          updatedAt: new Date(data.updated_at || Date.now()),
        }).onConflictDoNothing();

        break;
      }

      case 'user.updated': {
        const primaryEmail = data.email_addresses.find(
          (e) => e.email_address === data.email_addresses[0]?.email_address
        )?.email_address || null;

        await db.update(users)
          .set({
            email: primaryEmail,
            name: data.first_name && data.last_name
              ? `${data.first_name} ${data.last_name}`
              : data.name || 'User',
            image: data.image_url || null,
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

      default:
        console.log(`Unhandled webhook type: ${type}`);
    }

    return successResponse(c, { received: true }, 'Webhook processed');
  } catch (error) {
    console.error('Webhook processing error:', error);
    return errorResponse(c, 500, 'ServerError', 'Failed to process webhook');
  }
});

async function verifyClerkWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const [timestampPart, signaturePart] = signature.split('t=');
  if (!timestampPart || !signaturePart) {
    return false;
  }

  const timestamp = timestampPart.trim();
  const expectedSignature = signaturePart.trim();

  const signedPayload = `${timestamp}.${payload}`;

  const decodedSignature = Uint8Array.from(
    atob(expectedSignature.replace(/\s/g, '')),
    (c) => c.charCodeAt(0)
  );

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    decodedSignature,
    encoder.encode(signedPayload)
  );

  return isValid;
}