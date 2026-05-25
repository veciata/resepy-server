-- Run once on existing databases: mysql -u root -p tsresepy_db < sql/migrate-oauth.sql

ALTER TABLE users
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS auth_provider ENUM('local', 'google', 'facebook', 'veciata') NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS provider_uid VARCHAR(255) NULL;

-- MariaDB may not support IF NOT EXISTS on ADD COLUMN — use migrate-oauth.js instead if this fails.
