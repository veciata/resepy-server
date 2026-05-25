import dotenv from 'dotenv';
import app from './app.js';
import pool from './config/db.js';
import { migrateOAuth } from './db/migrateOAuth.js';

dotenv.config();

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

async function start() {
  await pool.query('SELECT 1');
  await migrateOAuth();
  app.listen(port, host, () => {
    console.log(`TS Recipe API listening on http://${host}:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
