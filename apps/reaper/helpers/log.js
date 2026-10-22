// =============================================================================
// Log formatting
//
// Every terminal line looks like: "12:04:31 🪓 reaped job 7bfe34b6 (building) → failed: ...".
// =============================================================================

/**
 * Print one line: local time, emoji, text. Two spaces after the emoji: many
 * terminals draw newer emojis (🪦 🪓) one column wide, so one space looks glued.
 */
export const log = (emoji, text) => console.log(`${new Date().toLocaleTimeString('en-GB')} ${emoji}  ${text}`);

/** First 8 characters of the job id. */
export const short = (job) => job.id.slice(0, 8);

/** Seconds → "10m 00s" / "42s". */
export function duration(seconds) {
  const s = Math.round(seconds);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}
