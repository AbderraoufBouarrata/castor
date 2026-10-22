// =============================================================================
// Log formatting
//
// Every terminal line looks like: "12:04:31 🔨 job 7bfe34b6 → building".
// =============================================================================

/** Print one line: local time, emoji, text. */
export const log = (emoji, text) => console.log(`${new Date().toLocaleTimeString('en-GB')} ${emoji} ${text}`);

/** First 8 characters of the job id. */
export const short = (job) => job.id.slice(0, 8);

/** "https://github.com/owner/repo" → "owner/repo". */
export const repoName = (job) => new URL(job.repoUrl).pathname.replace(/^\/|\/$|\.git$/g, '');

/** Seconds since the job started building, e.g. "12s". */
export const elapsed = (job) => `${Math.round((Date.now() - job.buildingAt) / 1000)}s`;

/** Log the job a finish promoted into the queue, if any. Takes finishJob's result. */
export const logPromotion = ({ promoted }) =>
  promoted && log('⏫', `job ${short(promoted)} → queued (user ${promoted.telegramUserId}'s next job)`);
