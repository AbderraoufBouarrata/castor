// =============================================================================
// Terminal logs
//
// Shared by the dispatcher and the reaper so every log line has the same shape:
//   "12:04:31 🔨  job 7bfe34b6 → building"
// =============================================================================

/**
 * Print one line: local time, emoji, text.
 *
 * Two spaces after the emoji: many terminals draw newer emojis (🪦 🪓) and
 * emojis with a variation selector (▶️ ⚠️) one column wide, so a single space
 * looks glued to the text.
 */
export const log = (emoji, text) => console.log(`${new Date().toLocaleTimeString('en-GB')} ${emoji}  ${text}`);

/** First 8 characters of a job id, enough to tell jobs apart in logs. */
export const short = (job) => job.id.slice(0, 8);

/** Seconds → "10m 00s" / "42s". */
export function duration(seconds) {
  const s = Math.round(seconds);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}
