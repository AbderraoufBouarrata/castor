# castor job-api

HTTP API for build jobs. Accepts submissions from the bot, checks the repo, writes job records, and exposes job status (including a change feed the bot polls).

Each user has at most one job in `queued`, `building` or `running`. Their other jobs stay `waiting` and enter the queue oldest first. A partial unique index in the database enforces this (see `packages/db/README.md`).

Will also serve the status page: a static `index.html` that polls `GET /api/v1/jobs`. There is no separate status app. Not written yet.

The schema, migrations and Prisma client live in `packages/db` (`@castor/db`), shared with the dispatcher and reaper.

## Layout

| Path | What |
|---|---|
| `index.js` | Entry point: builds the app, listens, closes cleanly on SIGTERM |
| `app.js` | Builds the Fastify app and registers controllers. Tests import this. |
| `controllers/` | HTTP layer: routes with their DTO and auth, plus handlers that call the service and shape the reply |
| `dtos/` | Request DTOs: JSON Schema for body, query and params, validated by Fastify |
| `hooks/` | Request hooks. `auth.js` checks the bearer token. |
| `services/` | Business rules: repo checks, submit, reads. The only layer that touches the database. |
| `test/` | `node:test` checks, run with `npm test` |
| `Dockerfile` | Production image |

## Requirements

- Node 22.18 or newer
- PostgreSQL with migrations applied (see `packages/db/README.md`)

## First run

Install from the repo root (npm workspaces), and set up the database first (`packages/db/README.md`):

```bash
npm install
```

Then:

```bash
cd apps/job-api
cp .env.example .env
npm run dev
```

Fill in `.env`:

| Var | Value |
|---|---|
| `DATABASE_URL` | e.g. `postgresql://postgres@localhost:5432/castor` |
| `API_TOKEN` | Output of `openssl rand -hex 32`. The bot sends the same value. |
| `PORT` | Defaults to `3000` |
| `HOST` | Defaults to `0.0.0.0` |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the API |
| `npm run dev` | Run the API and restart on file changes |
| `npm test` | Auth, validation and repo-check tests (no database or network needed) |

Database commands (migrate, generate, studio) are in `packages/db`.

## API

| Method | Path | Auth | What |
|---|---|---|---|
| `POST` | `/api/v1/jobs` | Bearer token | Submit a job. The repo must be public with a `Dockerfile` at its root. Returns 201 with the job, state `queued` or `waiting`. |
| `GET` | `/api/v1/jobs` | none | List jobs, newest first. Query: `telegramUserId`, `state`, `limit` (1-100, default 50). |
| `GET` | `/api/v1/jobs/changes` | none | Change feed: jobs updated after `since` (ISO 8601), oldest change first. Query: `since` (required), `limit` (1-100, default 100). The bot polls this. |
| `GET` | `/api/v1/jobs/:id` | none | One job, or 404. |

`POST /api/v1/jobs` body:

| Field | Required | Rule |
|---|---|---|
| `telegramUserId` | yes | Positive integer (`message.from.id`) |
| `repoUrl` | yes | `https://github.com/<owner>/<repo>` |
| `phone` | no | Digits, optional leading `+` |

Responses never include `phone`, because the `GET` routes are public.

Errors are JSON `{ statusCode, code, error, message }`. Clients should branch on `code`:

| Status | `code` | When |
|---|---|---|
| `400` | `FST_ERR_VALIDATION` | Invalid input |
| `401` | — | Missing or wrong token |
| `404` | — | Unknown job |
| `422` | `REPO_NOT_FOUND` | Repo is private or does not exist (GitHub answers 404 for both without a token) |
| `422` | `NO_DOCKERFILE` | Repo is public but has no `Dockerfile` at its root |
| `502` | `GITHUB_UNREACHABLE` | GitHub down, timed out or rate-limited |

The repo check (`assertBuildableRepo` in `services/jobs.js`) sends `HEAD https://raw.githubusercontent.com/<owner>/<repo>/HEAD/Dockerfile` (default branch, no token needed). Only if that is 404 does it send `HEAD https://github.com/<owner>/<repo>` to tell a missing Dockerfile from a private or missing repo. It checks the file exists, not that it builds. The name must be exactly `Dockerfile`.

Examples:

```bash
curl -s -X POST localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer $API_TOKEN" -H 'Content-Type: application/json' \
  -d '{"telegramUserId":111222333,"repoUrl":"https://github.com/docker/welcome-to-docker"}'

curl -s "localhost:3000/api/v1/jobs?telegramUserId=111222333&state=waiting"

curl -s "localhost:3000/api/v1/jobs/changes?since=2026-10-22T00:00:00Z"

curl -s localhost:3000/api/v1/jobs/<id>
```

## Docker

Build from the repo root (the image needs `packages/db`):

```bash
docker build -f apps/job-api/Dockerfile -t castor-job-api .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgresql://postgres@host.docker.internal:5432/castor \
  -e API_TOKEN=... castor-job-api
```

Run migrations before starting it (`packages/db/README.md`, castor-migrate image).
