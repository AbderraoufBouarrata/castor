# castor dispatcher (fake)

Claims queued jobs and walks them through their lifecycle. This is the **fake** dispatcher: it sleeps instead of creating VMs on Proxmox. Its database writes are the ones the real dispatcher will make, so the queue, the one-active-job-per-user rule and the bot's notifications can all be tested with no infrastructure.

```
queued → building → running → done
            ↘ failed    ↘ failed
```

When a job ends, the dispatcher moves the same user's oldest `waiting` job into the queue.

## Layout

| Path | What |
|---|---|
| `index.js` | Entry point: starts the scheduler, handles SIGTERM/SIGINT |
| `config.js` | Env vars and their defaults |
| `services/scheduler.js` | Main loop: claim queued jobs into free slots, log the queue |
| `services/simulator.js` | Walks one job through building/running with sleeps (stands in for the VM) |
| `services/jobs.js` | Every database read and write: count, claim, mark running. `finishJob` (finish + promote) comes from `@castor/db`, shared with the reaper. |
| `helpers/log.js` | Dispatcher log bits (`repoName`, `elapsed`, `logPromotion`). The line format itself (`log`, `short`) comes from `@castor/core`, shared with the reaper. |

## How it works

1. Every `POLL_SECONDS`, fill free slots (up to `MAX_CONCURRENT`) with queued jobs.
2. **Claim:** take the job that entered the queue first (`ORDER BY queued_at`) with `FOR UPDATE SKIP LOCKED`, and mark it `building`. Two dispatchers never take the same job.
3. **Building:** sleep one phase. With chance `FAIL_RATE / 2`, fail here with `dispatcher: docker build exited with code 1 (simulated)`.
4. **Running:** mark `running`, sleep one phase. Remaining failures happen here with `dispatcher: container exited with code 1 (simulated)`.

Errors follow the `source: message` convention (see `packages/db/README.md`).
5. **Finish:** mark `done` or `failed`, and in the same transaction promote the user's oldest `waiting` job to `queued`.

A phase lasts between `STEP_SECONDS` and `2 × STEP_SECONDS`.

Every state move is guarded by the state it expects. If another component (e.g. the reaper) already moved the job, the dispatcher leaves it alone.

On `SIGTERM` or `SIGINT` it stops claiming, finishes the jobs in flight, then exits. A job cut off by a hard kill stays `building`; the reaper will deal with it.

The bot announces each state change to the user (it polls job-api's change feed). The dispatcher never talks to Telegram.

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
cd apps/dispatcher
cp .env.example .env
npm run dev
```

## Config

| Var | Default | What |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string. Required. |
| `MAX_CONCURRENT` | `2` | Jobs run at once. Others stay `queued` until a slot frees. |
| `STEP_SECONDS` | `4` | Each phase lasts `STEP` to `2 × STEP` seconds |
| `FAIL_RATE` | `0.2` | Chance (0 to 1) that a job fails, half at build, half at run |
| `POLL_SECONDS` | `2` | Seconds between queue checks |

Fast run with no failures, for testing:

```bash
STEP_SECONDS=1 FAIL_RATE=0 npm run dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the dispatcher |
| `npm run dev` | Run and restart on file changes |

## Log output

```
12:04:29 🦫 dispatcher (fake) up: 2 slots, 4s steps, 20% failures
12:04:29 ▶️ started job 7bfe34b6 (docker/welcome-to-docker) for user 111222333 · slot 1/2
12:04:29 🔨 job 7bfe34b6 → building
12:04:29 📋 queue: 0 queued · 1 waiting · 1/2 slots busy
12:04:35 🚀 job 7bfe34b6 → running
12:04:41 ✅ job 7bfe34b6 → done in 12s
12:04:41 ⏫ job 62ce4660 → queued (user 111222333's next job)
12:04:43 ▶️ started job 62ce4660 (docker/welcome-to-docker) for user 111222333 · slot 1/2
12:04:43 🔨 job 62ce4660 → building
12:04:43 📋 queue: 0 queued · 0 waiting · 1/2 slots busy
12:04:49 ❌ job 62ce4660 → failed after 6s: dispatcher: docker build exited with code 1 (simulated)
```

| Emoji | Event |
|---|---|
| 🦫 | Dispatcher started |
| 📋 | Queue summary, printed only when a number changes |
| ▶️ | Job claimed from the queue |
| 🔨 🚀 | Job moved to `building` / `running` |
| ✅ ❌ | Job finished `done` / `failed` |
| ⏫ | User's next `waiting` job moved to `queued` |
| ⚠️ | Job was moved by someone else, left alone |
| 💥 | Unexpected error |
| 🛑 👋 | Shutdown requested / finished |

## Useful checks

Watch the queue:

```bash
watch -n1 'psql "$DATABASE_URL" -Atc "select left(id::text,8), telegram_user_id, state from jobs order by created_at desc limit 15"'
```

Jobs stuck in `building` or `running` (e.g. after a hard kill):

```bash
psql "$DATABASE_URL" -c "select id, state, building_at from jobs where state in ('building','running')"
```

## Docker

Build from the repo root (the image needs `packages/db`):

```bash
docker build -f apps/dispatcher/Dockerfile -t castor-dispatcher .
docker run --rm -e DATABASE_URL=postgresql://postgres@host.docker.internal:5432/castor castor-dispatcher
```

Any config var above can be passed with `-e`.

## Going real

Step 2 of the build order replaces `services/simulator.js` with Proxmox calls: clone the golden template, inject the job token by cloud-init, wait for the worker to report. `services/jobs.js` and the scheduler stay as they are.
