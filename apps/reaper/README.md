# castor reaper

Cleans up after the dispatcher. Every sweep it finds jobs stuck past their limit, fails them, and moves each affected user's next `waiting` job into the queue so their builds keep going.

| Stuck when | `jobs.error` |
|---|---|
| `building` longer than `BUILD_TIMEOUT_SECONDS` | `reaper: build timed out, stuck in building for 10m 04s (limit 10m 00s); the dispatcher likely stopped mid-build` |
| `running` longer than `TTL_SECONDS` | `reaper: exceeded time-to-live, running for 15m 02s (limit 15m 00s)` |

Errors follow the `source: message` convention (see `packages/db/README.md`), so the user sees it was the reaper.

A job usually gets stuck because the dispatcher that owned it crashed or was killed. The reaper works from job records only, never from another process's memory, which is why it runs separately: when the dispatcher dies, the reaper is still up.

The bot sees the change through job-api's change feed and tells the user why their job failed.

Not yet: destroying expired or orphaned VMs. That comes with the real dispatcher on Proxmox.

## Layout

| Path | What |
|---|---|
| `index.js` | Entry point: starts the sweeper, handles SIGTERM/SIGINT |
| `config.js` | Env vars and their defaults |
| `services/sweeper.js` | Loop: find stuck jobs, fail them, promote the next waiting job |
| `services/jobs.js` | Database queries (`findStuckJobs`) and the shared `finishJob` |
Log lines (`log`, `short`, `duration`) come from `@castor/core`, shared with the dispatcher.

`finishJob` comes from `@castor/db`. The dispatcher uses the same function, so a job finished by either one promotes the next waiting job in exactly the same way. It is guarded by state: if the dispatcher finishes a job at the same moment the reaper picks it, only one of them wins and the other skips it.

## Requirements

- Node 22.18 or newer
- PostgreSQL with migrations applied (see `packages/db/README.md`)

## First run

Install from the repo root (npm workspaces):

```bash
npm install
```

Then:

```bash
cd apps/reaper
cp .env.example .env
npm run dev
```

## Config

| Var | Default | What |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string. Required. |
| `BUILD_TIMEOUT_SECONDS` | `600` | Fail jobs building longer than this |
| `TTL_SECONDS` | `900` | Fail jobs running longer than this (time-to-live) |
| `SWEEP_SECONDS` | `30` | Seconds between sweeps |

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the reaper |
| `npm run dev` | Run and restart on file changes |

## Log output

```
12:10:00 💀 reaper up: build timeout 10m 00s, TTL 15m 00s, sweep every 30s
12:10:00 🪦 sweep: nothing stuck, the graveyard is quiet
12:10:30 🪓 reaped job 7bfe34b6 (building) → failed: reaper: build timed out, stuck in building for 10m 04s (limit 10m 00s); the dispatcher likely stopped mid-build
12:10:30 ⏫ job 62ce4660 → queued (user 111222333's next job)
```

| Emoji | Event |
|---|---|
| 💀 | Reaper started, or an unexpected sweep error |
| 🪓 | Stuck job reaped (failed) |
| 🪦 | Sweep found nothing stuck; shutdown requested / finished |
| ⏫ | User's next `waiting` job moved to `queued` |

## Testing it: kill the dispatcher mid-job

Step 3 of the build order: break it on purpose and confirm nothing leaks.

1. Start the dispatcher with long phases so jobs stay in `building`:
   ```bash
   cd apps/dispatcher && STEP_SECONDS=60 npm run dev
   ```
2. Submit a job from the bot and wait for `🔨 job … → building`.
3. Kill the dispatcher hard, so it gets no chance to clean up:
   ```bash
   pkill -9 -f "apps/dispatcher"
   ```
4. Run the reaper with a short timeout:
   ```bash
   cd apps/reaper && BUILD_TIMEOUT_SECONDS=10 SWEEP_SECONDS=5 npm run dev
   ```
5. Within a few seconds: `🪓 reaped job … (building) → failed: reaper: build timed out…`, and the user gets a ❌ message from the bot with the same reason.

Check nothing is left stuck:

```bash
psql "$DATABASE_URL" -c "select id, state, building_at, running_at from jobs where state in ('building','running')"
```

## Docker

Build from the repo root (the image needs `packages/db`):

```bash
docker build -f apps/reaper/Dockerfile -t castor-reaper .
docker run --rm -e DATABASE_URL=postgresql://postgres@host.docker.internal:5432/castor castor-reaper
```
