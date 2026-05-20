import { neon } from '@neondatabase/serverless';
import { createClerkClient } from '@clerk/backend';

const DATABASE_URL = process.env.DATABASE_URL;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}
if (!CLERK_SECRET_KEY) {
  console.error('CLERK_SECRET_KEY not set');
  process.exit(1);
}

async function syncUsers() {
  const sql = neon(DATABASE_URL!);
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

  let totalSynced = 0;
  let totalFailed = 0;
  let offset = 0;
  const limit = 100;

  console.log('Fetching users from Clerk…');

  while (true) {
    const { data: clerkUsers } = await clerk.users.getUserList({ limit, offset });
    if (clerkUsers.length === 0) break;

    for (const u of clerkUsers) {
      try {
        const primaryEmail = u.emailAddresses.find(
          (e) => e.id === u.primaryEmailAddressId,
        );
        const email = primaryEmail?.emailAddress ?? null;
        const emailVerified =
          primaryEmail?.verification?.status === 'verified';
        const name =
          u.firstName && u.lastName
            ? `${u.firstName} ${u.lastName}`
            : u.fullName ?? null;
        const avatarUrl = u.imageUrl ?? null;
        const username = u.username ?? null;
        const phoneNumber = u.phoneNumbers?.[0]?.phoneNumber ?? null;
        const signUpMethod =
          u.externalAccounts?.[0]?.provider ?? 'email';
        const passwordEnabled = u.passwordEnabled ?? false;
        const twoFactorEnabled = u.twoFactorEnabled ?? false;
        const banned = u.banned ?? false;
        const publicMetadata = JSON.stringify(u.publicMetadata ?? {});
        const lastSignInAt = u.lastSignInAt
          ? new Date(u.lastSignInAt).toISOString()
          : null;
        const createdAt = new Date(u.createdAt).toISOString();
        const updatedAt = new Date(u.updatedAt).toISOString();
        const id = crypto.randomUUID();

        await sql`
          INSERT INTO btracker_users (
            id, clerk_user_id, email, email_verified, name,
            avatar_url, username, phone_number, sign_up_method,
            password_enabled, two_factor_enabled, banned,
            public_metadata, last_sign_in_at, created_at, updated_at
          )
          VALUES (
            ${id}, ${u.id}, ${email}, ${emailVerified}, ${name},
            ${avatarUrl}, ${username}, ${phoneNumber}, ${signUpMethod},
            ${passwordEnabled}, ${twoFactorEnabled}, ${banned},
            ${publicMetadata}::jsonb, ${lastSignInAt}, ${createdAt}, ${updatedAt}
          )
          ON CONFLICT (clerk_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            email_verified = EXCLUDED.email_verified,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url,
            username = EXCLUDED.username,
            phone_number = EXCLUDED.phone_number,
            sign_up_method = EXCLUDED.sign_up_method,
            password_enabled = EXCLUDED.password_enabled,
            two_factor_enabled = EXCLUDED.two_factor_enabled,
            banned = EXCLUDED.banned,
            public_metadata = EXCLUDED.public_metadata,
            last_sign_in_at = EXCLUDED.last_sign_in_at,
            updated_at = EXCLUDED.updated_at
        `;

        totalSynced += 1;
        console.log(`  ✓ ${u.id}${email ? ` (${email})` : ''}`);
      } catch (err) {
        totalFailed += 1;
        console.error(`  ✗ ${u.id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (clerkUsers.length < limit) break;
    offset += limit;
  }

  console.log(`\nDone. Synced: ${totalSynced}. Failed: ${totalFailed}.`);
}

syncUsers().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
