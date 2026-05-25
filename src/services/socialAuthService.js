import { OAuth2Client } from 'google-auth-library';
import pool from '../config/db.js';
import { AppError } from '../middleware/error.js';
import {
  findUserByEmail,
  findUserById,
  findUserByProvider,
  createOAuthUser,
  createVeciataUser,
  verifyPassword,
} from './userService.js';

const VECIATA_EMAIL_SUFFIX = '@veciata.info';

export function isVeciataEmail(email) {
  return email?.toLowerCase().endsWith(VECIATA_EMAIL_SUFFIX);
}

export async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new AppError('Google sign-in is not configured on the server', 503);
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new AppError('Invalid Google token', 401);
  }
  return {
    provider: 'google',
    providerUid: payload.sub,
    email: payload.email,
    name: payload.name || payload.email?.split('@')[0] || 'google_user',
  };
}

export async function verifyFacebookAccessToken(accessToken) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    throw new AppError('Facebook sign-in is not configured on the server', 503);
  }

  const debugUrl = new URL('https://graph.facebook.com/debug_token');
  debugUrl.searchParams.set('input_token', accessToken);
  debugUrl.searchParams.set('access_token', `${appId}|${appSecret}`);
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();
  if (!debugData.data?.is_valid || debugData.data.app_id !== appId) {
    throw new AppError('Invalid Facebook token', 401);
  }

  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', accessToken);
  const profileRes = await fetch(profileUrl);
  const profile = await profileRes.json();
  if (!profile.id) {
    throw new AppError('Could not load Facebook profile', 401);
  }

  return {
    provider: 'facebook',
    providerUid: profile.id,
    email: profile.email,
    name: profile.name || 'facebook_user',
  };
}

export async function findOrCreateSocialUser(profile) {
  let user = await findUserByProvider(profile.provider, profile.providerUid);
  if (user) return user;

  if (profile.email) {
    const byEmail = await findUserByEmail(profile.email);
    if (byEmail) {
      await pool.query(
        `UPDATE users SET auth_provider = :provider, provider_uid = :providerUid
         WHERE id = :id`,
        {
          provider: profile.provider,
          providerUid: profile.providerUid,
          id: byEmail.id,
        },
      );
      return findUserById(byEmail.id);
    }
  }

  return createOAuthUser({
    provider: profile.provider,
    providerUid: profile.providerUid,
    email: profile.email || `${profile.providerUid}@${profile.provider}.local`,
    username: profile.name,
  });
}

export async function loginVeciataAccount(email, password) {
  if (!isVeciataEmail(email)) {
    throw new AppError('Use your @veciata.info email address', 400);
  }
  const user = await findUserByEmail(email.toLowerCase());
  if (!user || !(await verifyPassword(user, password))) {
    throw new AppError('Invalid email or password', 401);
  }
  return user;
}

export async function registerVeciataAccount({ username, email, password }) {
  if (!isVeciataEmail(email)) {
    throw new AppError('Registration requires an @veciata.info email', 400);
  }
  return createVeciataUser({ username, email: email.toLowerCase(), password });
}
