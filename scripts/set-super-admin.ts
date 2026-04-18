import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const userId = process.argv[2];

if (!userId) {
  console.error('Usage: npm run set-super-admin <clerk-user-id>');
  console.error('Example: npm run set-super-admin user_2xKsh4vwPkEFIOFPQGOOFjAfc');
  process.exit(1);
}

async function setSuperAdmin() {
  console.log(`Setting super admin for user: ${userId}`);
  const sql = neon(DATABASE_URL);

  const permissions = {
    'store.activate': true,
    'store.deactivate': true,
    'admin.manage': true,
  };

  try {
    await sql`
      INSERT INTO btracker_admin_roles (id, user_id, role, permissions, created_at, updated_at)
      VALUES (${crypto.randomUUID()}, ${userId}, 'super_admin', ${JSON.stringify(permissions)}, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        role = 'super_admin',
        permissions = ${JSON.stringify(permissions)},
        updated_at = NOW()
    `;
    console.log(`✓ Successfully set super admin for user ${userId}`);
  } catch (err) {
    console.error(`✗ Failed to set super admin: ${err}`);
    process.exit(1);
  }
}

setSuperAdmin();