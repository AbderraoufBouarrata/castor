// =============================================================================
// Castor bot
//
// Config, command routing, the Telegram poll loop and the job watcher.
// Nothing connects to the bot; it only calls out to Telegram and the Job API.
//
// To add a command: create commands/<name>.js, add it to COMMANDS below, and
// add it to the setMyCommands list in config/setup.js.
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';
import { telegram, reply } from './helpers/telegram.js';
import { build } from './commands/build.js';
import { jobs } from './commands/jobs.js';
import { help } from './commands/help.js';
import { clear } from './commands/clear.js';
import { watchJobs } from './watcher.js';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

for (const key of ['BOT_TOKEN', 'API_URL', 'API_TOKEN']) {
  if (!process.env[key]) throw new Error(`${key} is not set (see .env.example)`);
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

const COMMANDS = { '/build': build, '/jobs': jobs, '/clear': clear, '/start': help, '/help': help };

/** Route a text message to its command. Errors are logged; the user gets a generic reply. */
async function handle(msg) {
  const [word, arg] = msg.text.trim().split(/\s+/, 2);
  const command = COMMANDS[word.split('@')[0]] ?? help; // "/build@castorbot" in groups
  try {
    await command(msg, arg);
  } catch (err) {
    console.error(err.message);
    await reply(msg, '💥 Something went wrong. Try again later.').catch(() => {});
  }
}

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------

// getUpdates holds the connection open until an update arrives or the timeout
// passes. Each update is handled once: offset moves past it before handling.
// Job watcher runs alongside the poll loop and messages users on state changes.
watchJobs();

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
