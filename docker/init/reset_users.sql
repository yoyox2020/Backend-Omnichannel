-- ─────────────────────────────────────────────────────────────────────────────
-- Reset: wipe all sessions + users, then re-seed
-- Password for every user = Password123!
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Clear dependent tables first
TRUNCATE TABLE audit_logs    RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_sessions RESTART IDENTITY CASCADE;
TRUNCATE TABLE users                             CASCADE;

-- Re-seed roles (safe — ON CONFLICT skips existing)
INSERT INTO roles (id, name, label, hierarchy, description, is_active) VALUES
  (1, 'Root',    'Root Administrator', 1, 'Full system access — unrestricted', true),
  (2, 'Admin',   'Administrator',      2, 'Administrative access',             true),
  (3, 'Manager', 'Manager',            3, 'Team management access',            true),
  (4, 'Staff',   'Staff',              4, 'Standard staff access',             true)
ON CONFLICT (id) DO UPDATE
  SET name      = EXCLUDED.name,
      label     = EXCLUDED.label,
      hierarchy = EXCLUDED.hierarchy,
      is_active = EXCLUDED.is_active;

SELECT setval('roles_id_seq', 4, true);

-- Re-seed users  (password = Password123!)
-- Hash: $2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG
INSERT INTO users (email, username, password_hash, full_name, role_id, employee_id, department, is_active) VALUES
  ('root@omnichanel.local',        'root_admin',    '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Root Administrator', 1, 'EMP-0001', 'IT',         true),
  ('admin.sam@omnichanel.local',   'admin_sam',     '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Samuel Admin',       2, 'EMP-0002', 'IT',         true),
  ('admin.diana@omnichanel.local', 'admin_diana',   '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Diana Admin',        2, 'EMP-0003', 'IT',         true),
  ('manager.budi@omnichanel.local','manager_budi',  '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Budi Manager',       3, 'EMP-0004', 'Operations', true),
  ('staff.rina@omnichanel.local',  'staff_rina',    '$2a$12$zKJYoAr8hjw26C9JtmEnMe6CJVRD/vHgXLI.V.yfhl2c2NtBq15GG', 'Rina Staff',         4, 'EMP-0005', 'Support',    true);

COMMIT;

-- Verify
SELECT id, email, username, role_id, is_active FROM users ORDER BY role_id;
