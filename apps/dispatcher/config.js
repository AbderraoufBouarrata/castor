// =============================================================================
// Config
//
// Every env var the dispatcher reads, with defaults. DATABASE_URL is read and
// checked by @castor/db itself.
// =============================================================================

/** Jobs this dispatcher runs at once. Others stay queued until a slot frees. */
export const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT ?? 2);

/** Each phase (building, running) lasts between STEP and 2×STEP seconds. */
export const STEP_SECONDS = Number(process.env.STEP_SECONDS ?? 4);

/** Chance (0-1) that a job fails, half at build, half at run. */
export const FAIL_RATE = Number(process.env.FAIL_RATE ?? 0.2);

/** Seconds between queue checks. */
export const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? 2);
