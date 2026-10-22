# castor bot

Telegram client for Castor. Turns chat commands into Job API calls.

It gets updates by long polling (`getUpdates`). Nothing connects to it, so it needs no public URL or port. Run exactly one instance per token: a second poller gets `409 Conflict`.

## How it fits

```
user ──Telegram──> bot ──POST /api/v1/jobs (Bearer API_TOKEN)──> job-api
```

The user never sees `API_TOKEN`. It is a shared secret between the bot and job-api, both servers you run.

## Commands

| Command | What it does |
|---|---|
| `/build <url>` | Submit `https://github.com/<owner>/<repo>`. Replies `queued`, or `waiting` if you already have a job in progress. |
| `/jobs` | Your 10 most recent jobs and their state |
| `/start`, `/help`, anything else | Usage text |

## Requirements

- Node 22 or newer (uses `--env-file` and built-in `fetch`)
- A bot token from [@BotFather](https://t.me/BotFather) (`/newbot`)
- job-api running (see `apps/job-api/README.md`)
- Network access to `api.telegram.org`. If it is blocked, every poll logs `fetch failed UND_ERR_CONNECT_TIMEOUT`. Use a VPN, or a proxy: `HTTPS_PROXY=http://127.0.0.1:PORT NODE_USE_ENV_PROXY=1 npm start`.

## First run

```bash
cd apps/bot
npm install
cp .env.example .env
```

Fill in `.env`:

| Var | Value |
|---|---|
| `BOT_TOKEN` | Token from BotFather |
| `API_URL` | Job API base URL, e.g. `http://localhost:3000` |
| `API_TOKEN` | Same value as `API_TOKEN` in `apps/job-api/.env` |

Need a new `API_TOKEN`? Generate one and put it in both `.env` files:

```bash
openssl rand -hex 32
```

Run the one-time config. It sets the bot's name (`Castor`), descriptions (`Bobr The Builder`), avatar (`castor.jpg`) and command menu, and removes any old webhook:

```bash
npm run setup
```

Start the bot:

```bash
npm start
```

Now send `/build https://github.com/owner/repo` to the bot on Telegram.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Run the bot |
| `npm run setup` | Set name, descriptions, avatar, command menu; remove webhook. Safe to re-run. |

## Useful checks

Is Telegram reachable from this machine?

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://api.telegram.org
```

`getUpdates` fails with `409 Conflict` while a webhook is set. Check, then remove it:

```bash
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"
```

Does the bot's `API_TOKEN` match job-api? A `400` means auth passed, `401` means mismatch:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API_URL/api/v1/jobs" \
  -H "Authorization: Bearer $API_TOKEN" -H 'Content-Type: application/json' -d '{}'
```

## Changing name, description, avatar or command menu

Edit `NAME` and `DESCRIPTION` at the top of `config/setup.js`, the `setMyCommands` list there, or replace `castor.jpg`. Then run `npm run setup` again. Telegram rate-limits `setMyName`, so don't loop it.
