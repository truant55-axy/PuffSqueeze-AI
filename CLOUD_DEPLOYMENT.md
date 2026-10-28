# PuffSqueeze cloud deployment

Only this `website` directory is the cloud repository. Do not initialize Git or
push from the parent `PuffSqueeze_Transfer` directory: the parent contains a real
database snapshot, private configuration, local runtimes and logs.

## Files that must stay out of Git

- `.env`, `.env.local` and `backend/.env`
- `node_modules`, `dist`, `.voice-models` and `.voice-venv`
- the parent bundle's `database`, `private`, `runtime`, `logs` and `data` folders
- database exports, archives and local settings

Before every push, run `git status --short` and confirm that none of those files
are staged. Secrets belong in Render or Vercel environment variables.

## Vercel frontend

Import the GitHub repository as a Vite project. Use the repository root, run
`npm run build`, and publish `dist`. `vercel.json` already records these values.

The checked-in `.env.production` contains only the public backend URL:

```text
VITE_API_BASE_URL=https://puffsqueeze-ai.onrender.com
```

Do not put `GEMINI_API_KEY` or database credentials in Vercel. If the Render URL
changes, set `VITE_API_BASE_URL` in Vercel and redeploy the frontend.

## Render PHP backend

Use the existing Render Web Service and keep these settings:

- Runtime: Docker
- Root Directory: `backend`
- Dockerfile Path: `./Dockerfile`
- Health Check Path: `/api/health`
- Auto-Deploy: enabled for `main`

Set the following Render environment variables with the real TiDB values:

```text
APP_ENV=production
APP_TIMEZONE=Asia/Shanghai
DB_TIMEZONE=+08:00
DB_HOST=<TiDB host>
DB_PORT=4000
DB_NAME=moodle
DB_USER=<TiDB user>
DB_PASSWORD=<TiDB password>
DB_SSL_MODE=verify_identity
DB_SSL_CA=/etc/ssl/certs/ca-certificates.crt
MOODLE_TABLE_PREFIX=
ALLOWED_ORIGIN=https://puff-squeeze-ai.vercel.app
GEMINI_API_KEY=<Gemini key>
GEMINI_TRANSCRIBE_MODEL=gemini-flash-latest
```

The container runs additive schema preparation before starting the HTTP server.
It creates `puffsqueeze_voice_recordings` when missing so recognized audio and
its transcript can be stored under the authenticated user. It does not drop
tables or import the private transfer snapshot. Back up TiDB before the first
deployment and review schema changes before applying them.

## Voice and hardware

The ordinary web, account, AI, care and synchronization APIs run in the PHP
container. Short browser recordings are transcribed through Gemini using the
same server-side `GEMINI_API_KEY`; successful recordings and transcripts are
stored in TiDB. Neural speech synthesis still requires a separate Python runtime, so
without `VOICE_PYTHON` that endpoint safely reports that synthesis is
unavailable. The local M5 bridge is not started on Vercel or Render. Browser
Bluetooth/USB features remain client-side.

## Verification

Run locally before pushing:

```text
npm run lint
npm run build
```

After deployment, verify:

1. `https://puffsqueeze-ai.onrender.com/api/health` returns HTTP 200.
2. Registration and login work from `https://puff-squeeze-ai.vercel.app`.
3. Render logs show `Database ready` before the PHP server starts.
4. TiDB contains the expected `puffsqueeze_` tables; do not upload the transfer
   bundle's `database/puffsqueeze.sql` to GitHub or import it over live data.
