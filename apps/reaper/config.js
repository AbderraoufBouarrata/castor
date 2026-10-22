// =============================================================================
// Config
//
// Every env var the reaper reads, with defaults. DATABASE_URL is read and
// checked by @castor/db itself.
// =============================================================================

/** A job building longer than this is failed: "build timed out". */
export const BUILD_TIMEOUT_SECONDS = Number(process.env.BUILD_TIMEOUT_SECONDS ?? 600);

/** A job running longer than this (its time-to-live) is failed: "exceeded time-to-live". */
export const TTL_SECONDS = Number(process.env.TTL_SECONDS ?? 900);

/** Seconds between sweeps. */
export const SWEEP_SECONDS = Number(process.env.SWEEP_SECONDS ?? 30);
