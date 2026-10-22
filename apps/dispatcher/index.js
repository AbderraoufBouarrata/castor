// =============================================================================
// Castor dispatcher (fake): entry point
//
// Starts the scheduler and shuts it down cleanly. The work lives in:
//   config.js              env vars and defaults
//   services/scheduler.js  main loop: claim queued jobs into free slots
//   services/simulator.js  walks a job through building/running (fake VM)
//   services/jobs.js       every database read and write
//   helpers/log.js         emoji log lines
// =============================================================================

import { db } from '@castor/db';
import { MAX_CONCURRENT, STEP_SECONDS, FAIL_RATE } from './config.js';
import { log } from './helpers/log.js';
import { run, stop } from './services/scheduler.js';

// Kubernetes stops pods with SIGTERM: stop claiming, let in-flight jobs finish.
// ponytail: a job cut off by a hard kill stays building; the reaper will fail it.
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop(signal));

log('🦫', `dispatcher (fake) up: ${MAX_CONCURRENT} slots, ${STEP_SECONDS}s steps, ${FAIL_RATE * 100}% failures`);
await run();
await db.$disconnect();
log('👋', 'dispatcher stopped');
