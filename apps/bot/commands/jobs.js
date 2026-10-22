// =============================================================================
// /jobs: the sender's 10 most recent jobs
// =============================================================================

import { api } from '../helpers/api.js';
import { reply } from '../helpers/telegram.js';
import { HELP, formatJob } from '../helpers/format.js';

export async function jobs(msg) {
  const { status, data } = await api('GET', `/jobs?telegramUserId=${msg.from.id}&limit=10`);
  if (status !== 200) throw new Error(`GET /jobs ${status}: ${JSON.stringify(data)}`);

  if (!data.length) return reply(msg, `📭 No jobs yet.\n${HELP}`);
  return reply(msg, data.map(formatJob).join('\n'));
}
