# TS Recipe API

Express + MariaDB backend for the Flutter app.

## Setup

```bash
cd server
cp .env.example .env
# Edit .env with DB credentials and JWT secrets

npm install
npm run db:init
npm run dev
```

On startup the API applies any pending OAuth schema changes automatically. For manual runs only: `npm run db:migrate-oauth`.

### Database access troubleshooting

If you see `Access denied for user 'tsresepy_user'@'192.168.1.x'`:

MariaDB permissions are `user@client-host`. A user created as `tsresepy_user@localhost` cannot connect from your PC (`192.168.1.5`).

**Option A — Grant remote access (on the MariaDB server as root):**

```bash
# Edit YOUR_PASSWORD in sql/setup-user.sql first, then:
mysql -u root -p < sql/setup-user.sql
```

**Option B — Run init on the DB server via SSH:**

```bash
# In server/.env on the machine that hosts MariaDB:
DB_HOST=127.0.0.1
npm run db:init
```

**Option C — Bootstrap with root once** (add to `.env`, remove after init):

```env
DB_ADMIN_USER=root
DB_ADMIN_PASSWORD=your_root_password
```

API base: `http://localhost:3001/api`  
Auth: `http://localhost:3001/api/auth`

## Flutter config

Copy the project root `.env.example` to `.env` and set `API_HOST` / `API_PORT` (or `API_BASE_URL`).

```bash
cp ../.env.example ../.env
# edit API_HOST=your.server.ip
flutter run
```

Optional compile-time override:

```bash
flutter run --dart-define=API_HOST=192.168.1.50 --dart-define=API_PORT=3001
```

## Production

```bash
npm install --production
npm run db:init
pm2 start ecosystem.config.cjs
```

Copy `Caddyfile.example` to `/etc/caddy/Caddyfile` (or include it) and reload Caddy for HTTPS reverse proxy.

## Default admin

Created on first `db:init` if no users exist (see `.env.example`).

## Social login (Google, Facebook, Veciata)

1. Restart the API (or run `npm run db:migrate-oauth`) so existing databases get `auth_provider` / `provider_uid` columns.

2. Set in `server/.env`:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

3. Set matching values in the Flutter `.env` (`GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`).

4. Android: update `android/app/src/main/res/values/strings.xml` with your Facebook App ID and client token.

API endpoints:

- `POST /api/auth/google` — body `{ "id_token": "..." }`
- `POST /api/auth/facebook` — body `{ "access_token": "..." }`
- `POST /api/auth/veciata/login` — `@veciata.info` email + password
- `POST /api/auth/veciata/register` — register with `@veciata.info` email
