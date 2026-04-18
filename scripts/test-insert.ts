import { Client } from '@neondatabase/serverless';
import 'dotenv/config';

const client = new Client(process.env.DATABASE_URL);
await client.connect();

try {
  const id = crypto.randomUUID();
  await client.query('INSERT INTO btracker_users (id, clerk_user_id, email, name, email_verified, password_enabled, two_factor_enabled, banned) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, 'test_user', 'test@test.com', 'Test User', true, false, false, false]);
  console.log('Insert with explicit id worked!');
} catch (err) {
  console.error('Insert failed:', err.message);
}

const result = await client.query('SELECT * FROM btracker_users');
console.log('Users count:', result.rowCount);

await client.end();