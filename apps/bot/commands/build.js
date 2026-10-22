// =============================================================================
// /build <github url>: submit a job for the sender
// =============================================================================

import { api } from '../helpers/api.js';
import { reply } from '../helpers/telegram.js';

export async function build(msg, repoUrl) {
  if (!repoUrl) return reply(msg, 'ℹ️ Usage: /build https://github.com/owner/repo');

  const { status, data } = await api('POST', '/jobs', { telegramUserId: msg.from.id, repoUrl });
  if (status === 400) return reply(msg, '⚠️ That is not a GitHub repo URL. Use https://github.com/owner/repo');
  if (status === 422 && data.code === 'REPO_NOT_FOUND') return reply(msg, '🔒 That repo is private or does not exist. Castor only builds public GitHub repos.');
  if (status === 422 && data.code === 'NO_DOCKERFILE') return reply(msg, '📄 No Dockerfile at the root of that repo. Add a file named Dockerfile at the top level.');
  // Anything else (GitHub down, API error) → the router replies "Something went wrong".
  if (status !== 201) throw new Error(`POST /jobs ${status}: ${JSON.stringify(data)}`);

  // The watcher announces queued/waiting and every later state.
  return reply(msg, `📥 Got it! I'll keep you posted here as job ${data.id.slice(0, 8)} moves along.`);
}
