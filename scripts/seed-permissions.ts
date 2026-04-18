import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const allPermissions = [
  { name: 'can_view_orders', description: 'View orders', group: 'Orders' },
  { name: 'can_manage_orders', description: 'Manage orders', group: 'Orders' },
  { name: 'can_view_products', description: 'View products', group: 'Products' },
  { name: 'can_manage_products', description: 'Manage products', group: 'Products' },
  { name: 'can_add_custom_products', description: 'Add custom products', group: 'Products' },
  { name: 'can_view_customers', description: 'View customers', group: 'Customers' },
  { name: 'can_manage_customers', description: 'Manage customers', group: 'Customers' },
  { name: 'can_view_roles', description: 'View roles', group: 'Roles' },
  { name: 'can_manage_roles', description: 'Manage roles', group: 'Roles' },
  { name: 'can_view_members', description: 'View members', group: 'Members' },
  { name: 'can_manage_members', description: 'Manage members', group: 'Members' },
  { name: 'can_view_invitations', description: 'View invitations', group: 'Invitations' },
  { name: 'can_manage_invitations', description: 'Manage invitations', group: 'Invitations' },
  { name: 'can_view_master_wallet', description: 'View master wallet', group: 'Wallets' },
  { name: 'can_manage_master_wallet', description: 'Manage master wallet', group: 'Wallets' },
  { name: 'can_view_member_wallets', description: 'View member wallets', group: 'Wallets' },
  { name: 'can_manage_member_wallets', description: 'Manage member wallets', group: 'Wallets' },
  { name: 'can_manage_expense_categories', description: 'Manage expense categories', group: 'Wallets' },
  { name: 'can_view_own_wallet', description: 'View own wallet', group: 'Wallets' },
  { name: 'can_view_activity_logs', description: 'View activity logs', group: 'Logs' },
  { name: 'can_view_inventory_logs', description: 'View inventory logs', group: 'Logs' },
  { name: 'can_view_stores', description: 'View stores', group: 'Stores' },
  { name: 'can_manage_stores', description: 'Manage stores', group: 'Stores' },
];

async function seed() {
  console.log('Seeding permissions...');
  const sql = neon(DATABASE_URL);

  let inserted = 0;
  for (const perm of allPermissions) {
    try {
      await sql`INSERT INTO btracker_permissions (id, name, description, "group") VALUES (gen_random_uuid(), ${perm.name}, ${perm.description}, ${perm.group}) ON CONFLICT (name) DO NOTHING`;
      inserted++;
      console.log(`  ✓ ${perm.name}`);
    } catch (err) {
      console.error(`  ✗ ${perm.name}: ${err}`);
    }
  }

  console.log(`\nDone! Inserted ${inserted} of ${allPermissions.length} permissions.`);
}

seed();