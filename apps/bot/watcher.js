// =============================================================================
// Job watcher
//
// Polls the Job API change feed and messages each job's owner when its state
// changes: waiting, queued, building, running, done, failed.
//
// The cursor is the updatedAt of the last change seen; it starts at boot time,
// so changes made while the bot was down are not announced.
// ponytail: in-memory cursor and plain `>`; two changes in the same millisecond
// across a poll boundary can be missed. Persist the cursor if that matters.
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';
import { api } from './helpers/api.js';
import { telegram } from './helpers/telegram.js';
import { jobUpdate } from './helpers/format.js';

/** Seconds between change-feed polls. Shorter than a dispatcher phase, so states aren't skipped. */
const POLL_SECONDS = 2;

/** Run forever. Errors are logged and the next poll retries from the same cursor. */
export async function watchJobs() {
  let since = new Date().toISOString();

  for (;;) {
    try {
      const { status, data } = await api('GET', `/jobs/changes?since=${encodeURIComponent(since)}`);
      if (status !== 200) throw new Error(`GET /jobs/changes ${status}: ${JSON.stringify(data)}`);

      for (const job of data) {
        // In a private chat, the chat id is the user id.
        await telegram('sendMessage', { chat_id: job.telegramUserId, text: jobUpdate(job) })
          .catch((err) => console.error(`notify ${job.id}: ${err.message}`));
        since = job.updatedAt;
      }
    } catch (err) {
      console.error(`watcher: ${err.message}`);
    }
    await sleep(POLL_SECONDS * 1000);
  }
}
