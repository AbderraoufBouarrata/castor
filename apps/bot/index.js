// =============================================================================
// Castor bot
//
// Telegram client over long polling. Turns chat commands into Job API calls:
//   /build <github url>   submit a job
//   /jobs                 list your recent jobs
// Nothing connects to the bot; it only calls out to Telegram and the Job API.
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const { BOT_TOKEN, API_URL, API_TOKEN } = process.env;
for (const [key, value] of Object.entries({ BOT_TOKEN, API_URL, API_TOKEN })) {
  if (!value) throw new Error(`${key} is not set (see .env.example)`);
}

// -----------------------------------------------------------------------------
// Telegram
// -----------------------------------------------------------------------------

/** Call a Telegram Bot API method. Throws on any non-ok reply. */
async function telegram(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description}`);
  return json.result;
}

const reply = (msg, text) => telegram('sendMessage', { chat_id: msg.chat.id, text });

// -----------------------------------------------------------------------------
// Job API
// -----------------------------------------------------------------------------

/** Call the Job API. Sends API_TOKEN, which POST /jobs requires. */
async function api(method, path, body) {
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      ...(body && { 'content-type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

const HELP = 'Send /build https://github.com/owner/repo to build a repo.\nSend /jobs to see your jobs.';

/** /build <url>: submit a job for the sender. */
async function build(msg, repoUrl) {
  if (!repoUrl) return reply(msg, 'Usage: /build https://github.com/owner/repo');

  const { status, data } = await api('POST', '/jobs', { telegramUserId: msg.from.id, repoUrl });
  if (status === 400) return reply(msg, 'That is not a GitHub repo URL. Use https://github.com/owner/repo');
  if (status !== 201) throw new Error(`POST /jobs ${status}: ${JSON.stringify(data)}`);

  return reply(msg, data.state === 'queued'
    ? `Job ${data.id} is queued.`
    : `Job ${data.id} is waiting. You already have a job in progress; this one starts when it ends.`);
}

/** /jobs: the sender's 10 most recent jobs. */
async function jobs(msg) {
  const { status, data } = await api('GET', `/jobs?telegramUserId=${msg.from.id}&limit=10`);
  if (status !== 200) throw new Error(`GET /jobs ${status}: ${JSON.stringify(data)}`);

  if (!data.length) return reply(msg, `No jobs yet.\n${HELP}`);
  return reply(msg, data.map((job) => `${job.state}  ${job.repoUrl}`).join('\n'));
}

const help = (msg) => reply(msg, HELP);

const COMMANDS = { '/build': build, '/jobs': jobs, '/start': help, '/help': help };

/** Route a text message to its command. Anything unknown gets the help text. */
async function handle(msg) {
  const [word, arg] = msg.text.trim().split(/\s+/, 2);
  const command = COMMANDS[word.split('@')[0]] ?? help; // "/build@castorbot" in groups
  try {
    await command(msg, arg);
  } catch (err) {
    console.error(err.message);
    await reply(msg, 'Something went wrong. Try again later.').catch(() => {});
  }
}

// -----------------------------------------------------------------------------
// Poll loop
// -----------------------------------------------------------------------------

// getUpdates holds the connection open until an update arrives or the timeout
// passes. Each update is handled once: offset moves past it before handling.
let offset = 0;
console.log('castor bot polling');
for (;;) {
  let updates;
  try {
    updates = await telegram('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
  } catch (err) {
    console.error(err.message, err.cause?.code ?? '');
    await sleep(5000);
    continue;
  }

  for (const { update_id, message } of updates) {
    offset = update_id + 1;
    if (message?.text && message.from) await handle(message);
  }
}
