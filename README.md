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
