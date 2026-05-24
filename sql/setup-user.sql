-- Run on the MariaDB server as root (mysql -u root -p < sql/setup-user.sql)
-- Replace YOUR_PASSWORD and adjust host pattern if needed.

CREATE DATABASE IF NOT EXISTS tsresepy_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Allow the app user from any host on your LAN (or use '192.168.1.5' for one machine only)
CREATE USER IF NOT EXISTS 'tsresepy_user'@'%' IDENTIFIED BY 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON tsresepy_db.* TO 'tsresepy_user'@'%';

-- If the user already exists only as tsresepy_user@localhost, also add remote access:
-- CREATE USER IF NOT EXISTS 'tsresepy_user'@'192.168.1.%' IDENTIFIED BY 'YOUR_PASSWORD';
-- GRANT ALL PRIVILEGES ON tsresepy_db.* TO 'tsresepy_user'@'192.168.1.%';

FLUSH PRIVILEGES;
