import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/error.js';
import {
  signAccessToken,
  signRefreshToken,
  requireAuth,
} from '../middleware/auth.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  storeRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  toPublicUser,
} from '../services/userService.js';

const router = Router();

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken(user.id, refreshToken);
  return { access_token: accessToken, refresh_token: refreshToken };
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      throw new AppError('username, email and password are required', 400);
    }
    const user = await createUser({ username, email, password });
    const tokens = await issueTokens(user);
    res.status(201).json({ ...tokens, user: toPublicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(user, password))) {
      throw new AppError('Invalid email or password', 401);
    }
    const tokens = await issueTokens(user);
    res.json({ ...tokens, user: toPublicUser(user) });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refresh_token: refreshToken } = req.body;
    if (!refreshToken) throw new AppError('refresh_token required', 400);

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    const valid = await isRefreshTokenValid(payload.sub, refreshToken);
    if (!valid) throw new AppError('Refresh token revoked or expired', 401);

    const user = await findUserById(payload.sub);
    if (!user) throw new AppError('User not found', 401);

    await revokeRefreshToken(refreshToken);
    const tokens = await issueTokens(user);
    res.json(tokens);
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refresh_token: refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ ok: true });
  }),
);

router.get(
  '/validate',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ valid: true });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user.id);
    if (!user) throw new AppError('User not found', 404);
    res.json(toPublicUser(user));
  }),
);

export default router;
