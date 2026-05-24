import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { AppError } from '../middleware/error.js';

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, username, email, password_hash, role FROM users WHERE email = :email',
    { email },
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, username, email, role FROM users WHERE id = :id',
    { id },
  );
  return rows[0] || null;
}

export async function createUser({ username, email, password, role = 'user' }) {
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError('Email already registered', 400);

  const passwordHash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    'INSERT INTO users (username, email, password_hash, role) VALUES (:username, :email, :passwordHash, :role)',
    { username, email, passwordHash, role },
  );
  return findUserById(result.insertId);
}

export async function verifyPassword(user, password) {
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
  };
}
