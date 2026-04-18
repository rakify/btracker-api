import { Client } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function migrate() {
  console.log('Running user table migration...');
  const client = new Client(DATABASE_URL);
  await client.connect();

  const alterStatements = [
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS avatar_url text`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS username text`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS phone_number text`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS sign_up_method text`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS password_enabled boolean NOT NULL DEFAULT false`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean NOT NULL DEFAULT false`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone`,
    `ALTER TABLE btracker_users ADD COLUMN IF NOT EXISTS public_metadata jsonb`,
    `ALTER TABLE btracker_users RENAME COLUMN image TO avatar_url`,
  ];

  for (const stmt of alterStatements) {
    try {
      await client.query(stmt);
      console.log(`  ✓ ${stmt.substring(0, 60)}...`);
    } catch (err) {
      console.error(`  ✗ ${stmt.substring(0, 60)}: ${err}`);
    }
  }

  await client.end();
  console.log('\nMigration complete!');
}

migrate();