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
