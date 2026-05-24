import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function dbConfig() {
  const useAdmin = Boolean(process.env.DB_ADMIN_USER);
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: useAdmin ? process.env.DB_ADMIN_USER : process.env.DB_USER || 'root',
    password: useAdmin
      ? process.env.DB_ADMIN_PASSWORD || ''
      : process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };
}

async function main() {
  const config = dbConfig();
  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error(
        '\nMariaDB denied access for',
        `'${config.user}' connecting to ${config.host}:${config.port}.`,
        '\nThe server sees your client as a specific host (e.g. 192.168.1.5).',
        'Grants must exist for that host, not only localhost.\n',
        'On the DB server, run as root (edit password in the file first):\n',
        '  mysql -u root -p < sql/setup-user.sql\n',
        'Or SSH into the DB machine and run db:init with DB_HOST=127.0.0.1 in .env.\n',
        'See server/README.md → Database access troubleshooting.\n',
      );
    }
    throw err;
  }

  const dbName = process.env.DB_NAME || 'tsresepy_db';
  let schema = fs.readFileSync(
    path.join(__dirname, '../sql/schema.sql'),
    'utf8',
  );
  schema = schema.replaceAll('__DB_NAME__', dbName);
  await connection.query(schema);
  await connection.changeUser({ database: dbName });

  const [users] = await connection.query('SELECT COUNT(*) AS count FROM users');
  if (users[0].count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@tsresepy.local';
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin12345';
    const hash = await bcrypt.hash(password, 12);
    await connection.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hash, 'admin'],
    );
    console.log(`Created admin user: ${email}`);
  }

  await connection.end();
  console.log('Database initialized.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
