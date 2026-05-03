// Run: node reset-users.js
const { Client } = require('pg');

const client = new Client({
  host: process.env.DB_HOST || '72.60.76.222',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'itsm_user',
  password: process.env.DB_PASSWORD || 'Pakubumi2020#',
  database: process.env.DB_NAME || 'itsm_ai',
});

const HASH = '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG'; // Password123!

async function run() {
  await client.connect();
  console.log('Connected to database.');

  await client.query('BEGIN');

  await client.query('DELETE FROM audit_logs');
  await client.query('DELETE FROM user_sessions');
  await client.query('DELETE FROM users');
  console.log('Cleared users, sessions, audit logs.');

  await client.query(`
    INSERT INTO roles (id, name, label, hierarchy, description, is_active) VALUES
      (1, 'Root',    'Root Administrator', 1, 'Full system access', true),
      (2, 'Admin',   'Administrator',      2, 'Administrative access', true),
      (3, 'Manager', 'Manager',            3, 'Team management access', true),
      (4, 'Staff',   'Staff',              4, 'Standard staff access', true)
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, label = EXCLUDED.label,
          hierarchy = EXCLUDED.hierarchy, is_active = EXCLUDED.is_active
  `);
  await client.query(`SELECT setval('roles_id_seq', 4, true)`);
  console.log('Roles seeded.');

  await client.query(`
    INSERT INTO users (email, username, password_hash, full_name, role_id, employee_id, department, is_active) VALUES
      ('root@omnichanel.local',        'root_admin',   $1, 'Root Administrator', 1, 'EMP-0001', 'IT',         true),
      ('admin.sam@omnichanel.local',   'admin_sam',    $1, 'Samuel Admin',       2, 'EMP-0002', 'IT',         true),
      ('admin.diana@omnichanel.local', 'admin_diana',  $1, 'Diana Admin',        2, 'EMP-0003', 'IT',         true),
      ('manager.budi@omnichanel.local','manager_budi', $1, 'Budi Manager',       3, 'EMP-0004', 'Operations', true),
      ('staff.rina@omnichanel.local',  'staff_rina',   $1, 'Rina Staff',         4, 'EMP-0005', 'Support',    true)
  `, [HASH]);

  await client.query('COMMIT');

  const { rows } = await client.query('SELECT email, username, role_id FROM users ORDER BY role_id');
  console.log('\nUsers in database:');
  rows.forEach(r => console.log(` [role ${r.role_id}] ${r.email} / ${r.username}`));
  console.log('\nDone. Password for all users = Password123!');

  await client.end();
}

run().catch(async err => {
  await client.query('ROLLBACK').catch(() => {});
  await client.end().catch(() => {});
  console.error('Error:', err.message);
  process.exit(1);
});
