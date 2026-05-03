-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Roles, Permissions, and Default Users
-- All passwords = Password123! (bcryptjs $2a$12 hash)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Roles ─────────────────────────────────────────────────────────────────────
INSERT INTO roles (id, name, label, hierarchy, description) VALUES
  (1, 'Root',    'Root Administrator', 1, 'Full system access — unrestricted'),
  (2, 'Admin',   'Administrator',      2, 'Administrative access'),
  (3, 'Manager', 'Manager',            3, 'Team management access'),
  (4, 'Staff',   'Staff',              4, 'Standard staff access')
ON CONFLICT DO NOTHING;

SELECT setval('roles_id_seq', 4, true);

-- ── Permissions ───────────────────────────────────────────────────────────────
INSERT INTO permissions (module, action, description) VALUES
  ('users',    'read',   'View user list and profiles'),
  ('users',    'create', 'Create new users'),
  ('users',    'update', 'Update user profiles'),
  ('users',    'delete', 'Soft-delete users'),
  ('roles',    'read',   'View roles'),
  ('roles',    'manage', 'Create and edit roles'),
  ('tickets',  'read',   'View tickets'),
  ('tickets',  'create', 'Create tickets'),
  ('tickets',  'update', 'Update tickets'),
  ('tickets',  'delete', 'Delete tickets'),
  ('reports',  'read',   'View reports'),
  ('settings', 'manage', 'Manage system settings')
ON CONFLICT DO NOTHING;

-- ── Role → Permission grants ──────────────────────────────────────────────────

-- Root: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Admin: everything except settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE module <> 'settings'
ON CONFLICT DO NOTHING;

-- Manager: tickets (all), reports (read), users (read)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE (module = 'tickets')
   OR (module = 'reports'  AND action = 'read')
   OR (module = 'users'    AND action = 'read')
ON CONFLICT DO NOTHING;

-- Staff: tickets read/create/update
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE module = 'tickets' AND action IN ('read', 'create', 'update')
ON CONFLICT DO NOTHING;

-- ── Default Users (password = Password123!) ───────────────────────────────────
INSERT INTO users (email, username, password_hash, full_name, role_id, employee_id, department) VALUES
  ('root@omnichanel.local',    'root_admin',    '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Root Administrator', 1, 'EMP-0001', 'IT'),
  ('admin.sam@omnichanel.local',   'admin_sam',   '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Samuel Admin',    2, 'EMP-0002', 'IT'),
  ('admin.diana@omnichanel.local', 'admin_diana', '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Diana Admin',     2, 'EMP-0003', 'IT'),
  ('manager.budi@omnichanel.local','manager_budi','$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Budi Manager',    3, 'EMP-0004', 'Operations'),
  ('staff.rina@omnichanel.local',  'staff_rina',  '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Rina Staff',      4, 'EMP-0005', 'Support')
ON CONFLICT DO NOTHING;
