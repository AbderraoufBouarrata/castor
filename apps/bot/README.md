# castor bot

Telegram client for Castor. Right now it answers every text message with `Hi`.

It gets updates by long polling (`getUpdates`). Nothing connects to it, so it needs no public URL, port or secret. Run exactly one instance per token: a second poller gets `409 Conflict`.

## Requirements

- Node 22 or newer (uses `--env-file` and built-in `fetch`)
- A bot token from [@BotFather](https://t.me/BotFather) (`/newbot`)

## First run

```bash
cd apps/bot
npm install
cp .env.example .env
```

Put the BotFather token in `BOT_TOKEN` in `.env`.

Run the one-time config. It sets the bot's name (`Castor`), descriptions (`Bobr The Builder`) and avatar (`castor.jpg`), and removes any old webhook:

```bash
npm run setup
```

Start the bot:

```bash
npm start
```

Now message the bot on Telegram. It replies `Hi`.

## Useful checks

`getUpdates` fails with `409 Conflict` while a webhook is set. Check, then remove it:

```bash
curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
curl -s "https://api.telegram.org/bot$BOT_TOKEN/deleteWebhook"
```

## Changing name, description or avatar

Edit `NAME` and `DESCRIPTION` at the top of `config/setup.js`, or replace `castor.jpg`. Then run `npm run setup` again. Telegram rate-limits `setMyName`, so don't loop it.
