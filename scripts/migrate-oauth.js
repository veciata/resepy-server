import dotenv from 'dotenv';
import pool from '../src/config/db.js';
import { migrateOAuth } from '../src/db/migrateOAuth.js';

dotenv.config();

async function main() {
  await migrateOAuth();
  await pool.end();
  console.log('OAuth migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
