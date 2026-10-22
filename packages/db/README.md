# @castor/db

Shared database package: Prisma schema, migrations and client for every Castor app (job-api, dispatcher, reaper).

One table, `jobs`, which is also the queue.

## Layout

| Path | What |
|---|---|
| `index.js` | Package entry. Exports `db`, `JobState`, `finishJob`. |
| `client.js` | The shared Prisma client (`db`) and `JobState` enum |
| `jobs.js` | `finishJob`: finish a job and promote the user's next waiting one. Used by the dispatcher and the reaper. |
| `Dockerfile` | `castor-migrate` image: runs `prisma migrate deploy` and exits |
| `prisma/schema.prisma` | Schema: `JobState` enum and `jobs` table |
| `prisma/migrations/` | SQL migrations. Commit these. |
| `prisma.config.ts` | Prisma CLI config (schema path, migrations path, `DATABASE_URL`) |
| `generated/prisma/` | Generated client. Not committed, rebuilt by `npm run generate`. |

## Requirements

- Node 22.18 or newer. The generated client is TypeScript, and Node runs it directly by stripping types.
- PostgreSQL 14 or newer

## First run

Install from the repo root (npm workspaces):

```bash
npm install
```

Then, in this folder:

```bash
cd packages/db
cp .env.example .env
```

| Var | Value |
|---|---|
| `DATABASE_URL` | e.g. `postgresql://postgres@localhost:5432/castor`. Used by the Prisma CLI only. |

Create the database if it does not exist:

```bash
psql "postgresql://postgres@localhost:5432/postgres" -c "create database castor"
```

Apply migrations, then generate the client:

```bash
npm run migrate
npm run generate
```

## Scripts

Run in `packages/db`, or from the root with `npm run <script> -w @castor/db`.

| Command | What it does |
|---|---|
| `npm run migrate` | Create a migration from schema changes and apply it (dev only) |
| `npm run migrate:deploy` | Apply committed migrations without creating new ones (production) |
| `npm run generate` | Regenerate the client in `generated/prisma/` |
| `npm run studio` | Browse and edit rows in a web UI |
| `npx prisma migrate status` | Show which migrations are applied |
| `npx prisma migrate reset` | Drop all data, re-apply every migration (dev only) |
| `npx prisma validate` | Check the schema for errors |

Prisma 7 does not regenerate the client after `migrate`. Always run `npm run generate` after a migration.

## Using it from an app

Add the dependency to the app's `package.json`:

```json
"dependencies": { "@castor/db": "*" }
```

Then:

```js
import { db, JobState } from '@castor/db';

const job = await db.job.findUnique({ where: { id } });
```

The importing app must have `DATABASE_URL` in its own environment. `client.js` throws at import if it is missing.

Finishing a job (dispatcher, reaper):

```js
import { finishJob, JobState } from '@castor/db';

const { finished, promoted } = await finishJob(job, JobState.failed, 'build timed out');
// finished: false if someone else already finished it
// promoted: the user's next job, moved from waiting to queued, or null
```

## The jobs table

| Column | What |
|---|---|
| `id` | UUID |
| `telegram_user_id` | Submitter (`message.from.id`) |
| `phone` | Submitter's phone, null unless shared |
| `repo_url` | `https://github.com/<owner>/<repo>` |
| `state` | `waiting`, `queued`, `building`, `running`, `done`, `failed`, `rejected` |
| `error` | Why it failed or was rejected |
| `created_at`, `queued_at`, `building_at`, `running_at`, `finished_at` | One timestamp per state change. Metrics are differences between them. |
| `updated_at` | Bumped on every write. Change feed cursor for the bot. |

### One active job per user

At most one row per `telegram_user_id` can be in `queued`, `building` or `running`. A partial unique index enforces it:

```sql
CREATE UNIQUE INDEX "jobs_one_active_per_user" ON "jobs"("telegram_user_id")
WHERE "state" IN ('queued', 'building', 'running');
```

Prisma can't express partial indexes, so this lives in the init migration SQL, not in `schema.prisma`. If you ever recreate the init migration, add it back by hand:

```bash
npm run migrate -- --name init --create-only
# append the CREATE UNIQUE INDEX above to the new migration.sql
npm run migrate
```

job-api relies on it: a unique violation on submit means "make the job `waiting`". The dispatcher relies on it when it promotes a user's next job.

## Changing the schema

1. Edit `prisma/schema.prisma`.
2. `npm run migrate -- --name <what_changed>` (e.g. `add_submitter`).
3. `npm run generate`.
4. Commit the schema and the new folder in `prisma/migrations/`.

## Docker: castor-migrate

Applies committed migrations, then exits. Run it before starting the apps (in Kubernetes: a Job, or an initContainer on job-api). Build from the repo root:

```bash
docker build -f packages/db/Dockerfile -t castor-migrate .
docker run --rm -e DATABASE_URL=postgresql://postgres@host.docker.internal:5432/castor castor-migrate
```

The app images (job-api, dispatcher, reaper) generate the Prisma client at build time, so they need no `generate` step at run time.

## Useful checks

```bash
psql "$DATABASE_URL" -c "select left(id::text, 8) id, telegram_user_id, state, repo_url, created_at from jobs order by created_at desc limit 20"
psql "$DATABASE_URL" -c "select state, count(*) from jobs group by state"
psql "$DATABASE_URL" -c "select indexname from pg_indexes where tablename = 'jobs'"
```
