// =============================================================================
// /build <github url>: submit a job for the sender
// =============================================================================

import { api } from '../helpers/api.js';
import { reply } from '../helpers/telegram.js';

export async function build(msg, repoUrl) {
  if (!repoUrl) return reply(msg, 'ℹ️ Usage: /build https://github.com/owner/repo');

  const { status, data } = await api('POST', '/jobs', { telegramUserId: msg.from.id, repoUrl });
  if (status === 400) return reply(msg, '⚠️ That is not a GitHub repo URL. Use https://github.com/owner/repo');
  if (status !== 201) throw new Error(`POST /jobs ${status}: ${JSON.stringify(data)}`);

  // queued: entered the queue now. waiting: the user already has an active job.
  return reply(msg, data.state === 'queued'
    ? `🕒 Job ${data.id} is queued.`
    : `⏸️ Job ${data.id} is waiting. You already have a job in progress; this one starts when it ends.`);
}
