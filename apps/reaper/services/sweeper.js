// =============================================================================
// Sweeper
//
// Every SWEEP_SECONDS: find jobs stuck in building/running past their limit,
// fail them, and promote each user's next waiting job so their queue moves on.
//
// A job is usually stuck because the dispatcher that owned it crashed or was
// killed. Later, when real VMs exist, this is also where expired and orphaned
// VMs get destroyed.
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';
import { JobState } from '@castor/db';
import { BUILD_TIMEOUT_SECONDS, TTL_SECONDS, SWEEP_SECONDS } from '../config.js';
import { log, short, duration } from '../helpers/log.js';
import { findStuckJobs, finishJob } from './jobs.js';

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

let stopping = false;

/** Wakes the sleep between sweeps so stop() takes effect right away. */
const wake = new AbortController();

// -----------------------------------------------------------------------------
// Sweep
// -----------------------------------------------------------------------------

/** Why a stuck job is being failed, for the job record and the user. */
const reason = (job) => job.state === JobState.building
  ? `build timed out after ${duration(BUILD_TIMEOUT_SECONDS)}`
  : `exceeded time-to-live of ${duration(TTL_SECONDS)}`;

/** Fail every stuck job. Returns how many were reaped. */
async function sweep() {
  const stuck = await findStuckJobs();
  let reaped = 0;

  for (const job of stuck) {
    const error = reason(job);
    // finishJob is guarded by state: if the dispatcher finished the job a
    // moment ago, nothing changes and the job is skipped.
    const { finished, promoted } = await finishJob(job, JobState.failed, error);
    if (!finished) continue;

    reaped++;
    log('🪓', `reaped job ${short(job)} (${job.state}) → failed: ${error}`);
    if (promoted) log('⏫', `job ${short(promoted)} → queued (user ${promoted.telegramUserId}'s next job)`);
  }
  return reaped;
}

// -----------------------------------------------------------------------------
// Control
// -----------------------------------------------------------------------------

/** Sweep until stop() is called. */
export async function run() {
  while (!stopping) {
    try {
      const reaped = await sweep();
      if (reaped === 0) log('🪦', 'sweep: nothing stuck, the graveyard is quiet');
    } catch (err) {
      log('💀', `sweep error: ${err.message}`);
    }
    await sleep(SWEEP_SECONDS * 1000, undefined, { signal: wake.signal }).catch(() => {});
  }
}

/** Stop after the current sweep. */
export function stop(reason) {
  log('🪦', `${reason}: stopping after this sweep`);
  stopping = true;
  wake.abort();
}
