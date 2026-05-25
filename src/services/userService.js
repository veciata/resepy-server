import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { AppError } from '../middleware/error.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    `SELECT id, username, email, password_hash, role, auth_provider, provider_uid
     FROM users WHERE email = :email`,
    { email: email.toLowerCase() },
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, email, role, auth_provider FROM users WHERE id = :id',
    { id },
  );
  return rows[0] || null;
}

export async function findUserByProvider(provider, providerUid) {
  const [rows] = await pool.query(
    `SELECT id, username, email, role, auth_provider FROM users
     WHERE auth_provider = :provider AND provider_uid = :providerUid`,
    { provider, providerUid },
  );
  return rows[0] || null;
}

async function uniqueUsername(base) {
  const safe = (base || 'user').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40) || 'user';
  let candidate = safe;
  let n = 0;
  while (true) {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE username = :username',
      { username: candidate },
    );
    if (!rows.length) return candidate;
    n += 1;
    candidate = `${safe}_${n}`;
  }
}

export async function createUser({ username, email, password, role = 'user' }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new AppError('Email already registered', 400);
  const [existingUsername] = await pool.query(
    'SELECT id FROM users WHERE username = :username',
    { username },
  );
  if (existingUsername.length > 0) {
    throw new AppError('Username already taken', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO users (username, email, password_hash, auth_provider, role)
     VALUES (:username, :email, :passwordHash, 'local', :role)`,
    { username, email: normalizedEmail, passwordHash, role },
  );
  return findUserById(result.insertId);
}

export async function createVeciataUser({ username, email, password, role = 'user' }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError('Email already registered', 400);
  const [existingUsername] = await pool.query(
    'SELECT id FROM users WHERE username = :username',
    { username },
  );
  if (existingUsername.length > 0) {
    throw new AppError('Username already taken', 400);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO users (username, email, password_hash, auth_provider, role)
     VALUES (:username, :email, :passwordHash, 'veciata', :role)`,
    { username, email, passwordHash, role },
  );
  return findUserById(result.insertId);
}

export async function createOAuthUser({ provider, providerUid, email, username }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new AppError('Email already registered with another method', 400);

  const name = await uniqueUsername(username);
  const [result] = await pool.query(
    `INSERT INTO users (username, email, password_hash, auth_provider, provider_uid, role)
     VALUES (:username, :email, NULL, :provider, :providerUid, 'user')`,
    {
      username: name,
      email: normalizedEmail,
      provider,
      providerUid,
    },
  );
  return findUserById(result.insertId);
}

export async function verifyPassword(user, password) {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export async function storeRefreshToken(userId, refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const decoded = JSON.parse(
    Buffer.from(refreshToken.split('.')[1], 'base64url').toString(),
  );
  const expiresAt = new Date(decoded.exp * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (:userId, :tokenHash, :expiresAt)',
    { userId, tokenHash, expiresAt },
  );
}

export async function revokeRefreshToken(refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await pool.query('DELETE FROM refresh_tokens WHERE token_hash = :tokenHash', {
    tokenHash,
  });
}

export async function isRefreshTokenValid(userId, refreshToken) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const [rows] = await pool.query(
    `SELECT id FROM refresh_tokens
     WHERE user_id = :userId AND token_hash = :tokenHash AND expires_at > NOW()`,
    { userId, tokenHash },
  );
  return rows.length > 0;
}

export function toPublicUser(user) {
  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    name: user.username,
    role: user.role,
    authProvider: user.auth_provider,
  };
}
