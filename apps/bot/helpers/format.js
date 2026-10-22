// =============================================================================
// Formatters
//
// Shared reply text. Command-specific text lives in the command's own file.
// =============================================================================

/** Usage text: /start, /help, unknown input, empty job list. */
export const HELP = '🦫 Send /build https://github.com/owner/repo to build a repo.\n📋 Send /jobs to see your jobs.';

/** Emoji shown next to each job state. */
const STATE_EMOJI = {
  waiting: '⏸️',
  queued: '🕒',
  rejected: '🚫',
  building: '🔨',
  running: '🚀',
  done: '✅',
  failed: '❌',
};

/** One job as a line: emoji, state, repo. */
export const formatJob = (job) => `${STATE_EMOJI[job.state] ?? '•'} ${job.state}  ${job.repoUrl}`;

// -----------------------------------------------------------------------------
// Job updates (sent by watcher.js on every state change)
// -----------------------------------------------------------------------------

/** "https://github.com/owner/repo" → "owner/repo". */
const repoName = (url) => new URL(url).pathname.replace(/^\/|\/$|\.git$/g, '');

/** Milliseconds between two ISO timestamps → "1m 05s" / "42s". */
function duration(from, to) {
  const s = Math.round((new Date(to) - new Date(from)) / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

/** Message telling the user where their job is now. */
export function jobUpdate(job) {
  const repo = repoName(job.repoUrl);
  const id = job.id.slice(0, 8);
  switch (job.state) {
    case 'waiting':
      return `⏸️ ${repo} is waiting (job ${id}).\nYou already have a build in progress. This one enters the queue as soon as that one ends.`;
    case 'queued':
      return `🕒 ${repo} entered the queue (job ${id}).\nIt starts building as soon as a builder is free.`;
    case 'building':
      return `🔨 Building ${repo}…`;
    case 'running':
      return `🚀 ${repo} built in ${duration(job.buildingAt, job.runningAt)} and is now running.`;
    case 'done':
      return `✅ ${repo} finished. Total time ${duration(job.buildingAt, job.finishedAt)}.`;
    case 'failed':
      return `❌ ${repo} failed: ${job.error ?? 'unknown error'}`;
    case 'rejected':
      return `🚫 ${repo} was rejected: ${job.error ?? 'no reason given'}`;
    default:
      return `${repo}: ${job.state}`;
  }
}
