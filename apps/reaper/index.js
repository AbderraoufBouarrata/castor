// =============================================================================
// Castor reaper: entry point
//
// Starts the sweeper and shuts it down cleanly. The work lives in:
//   config.js            env vars and defaults
//   services/sweeper.js  loop: fail stuck jobs, promote the next waiting one
//   services/jobs.js     database queries
//   @castor/core         emoji log lines (shared with the dispatcher)
//
// Separate from the dispatcher on purpose: if the dispatcher dies mid-job,
// the reaper is still running and cleans up after it.
// =============================================================================

import { db } from "@castor/db";
import { BUILD_TIMEOUT_SECONDS, TTL_SECONDS, SWEEP_SECONDS } from "./config.js";
import { log, duration } from "@castor/core";
import { run, stop } from "./services/sweeper.js";

for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => stop(signal));

log(
    "💀",
    `reaper up: build timeout ${duration(BUILD_TIMEOUT_SECONDS)}, TTL ${duration(TTL_SECONDS)}, sweep every ${duration(SWEEP_SECONDS)}`,
);
await run();
await db.$disconnect();
log("🪦", `reaper stopped`);
