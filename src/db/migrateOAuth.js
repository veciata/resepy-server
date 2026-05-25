import pool from '../config/db.js';

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { table, column },
  );
  return rows[0].c > 0;
}

/** Ensures OAuth columns exist (safe to run on every startup). */
export async function migrateOAuth() {
  if (!(await columnExists('users', 'auth_provider'))) {
    await pool.query(
      `ALTER TABLE users ADD COLUMN auth_provider ENUM('local','google','facebook','veciata') NOT NULL DEFAULT 'local'`,
    );
    console.log('DB: added auth_provider column');
  }

  if (!(await columnExists('users', 'provider_uid'))) {
    await pool.query(`ALTER TABLE users ADD COLUMN provider_uid VARCHAR(255) NULL`);
    console.log('DB: added provider_uid column');
  }

  await pool.query(`ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL`);

  try {
    await pool.query(
      `CREATE UNIQUE INDEX uq_users_provider ON users (auth_provider, provider_uid)`,
    );
    console.log('DB: added unique index on auth provider');
  } catch (err) {
    if (err.code !== 'ER_DUP_KEYNAME') throw err;
  }
}
