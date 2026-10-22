// =============================================================================
// Scheduler
//
// The main loop: every POLL_SECONDS, fill free slots with queued jobs and log
// the queue. Each claimed job runs in the background via the simulator.
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';
import { MAX_CONCURRENT, POLL_SECONDS } from '../config.js';
import { log, short } from '@castor/core';
import { repoName } from '../helpers/log.js';
import { countPending, claimNextJob } from './jobs.js';
import { simulate } from './simulator.js';

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------

/** Ids of jobs this process is running right now. */
const active = new Set();

/** Set by stop(): claim nothing new, exit once active is empty. */
let stopping = false;

/** Last queue summary printed, so it is only logged when it changes. */
let lastSummary = '';

// -----------------------------------------------------------------------------
// Steps
// -----------------------------------------------------------------------------

/** Claim queued jobs until every slot is busy or the queue is empty. */
async function fillSlots() {
  while (!stopping && active.size < MAX_CONCURRENT) {
    const job = await claimNextJob();
    if (!job) return;

    log('▶️', `started job ${short(job)} (${repoName(job)}) for user ${job.telegramUserId} · slot ${active.size + 1}/${MAX_CONCURRENT}`);
    active.add(job.id);
    simulate(job)
      .catch((err) => log('💥', `job ${short(job)} error: ${err.message}`))
      .finally(() => active.delete(job.id));
  }
}

/** Log "📋 queue: 3 queued · 2 waiting · 1/2 slots busy" when any number changes. */
async function logQueue() {
  const { queued, waiting } = await countPending();
  const summary = `queue: ${queued} queued · ${waiting} waiting · ${active.size}/${MAX_CONCURRENT} slots busy`;
  if (summary !== lastSummary) log('📋', summary);
  lastSummary = summary;
}

// -----------------------------------------------------------------------------
// Control
// -----------------------------------------------------------------------------

/** Run until stop() is called and every in-flight job has finished. */
export async function run() {
  while (!stopping || active.size > 0) {
    try {
      await fillSlots();
      await logQueue();
    } catch (err) {
      log('💥', `loop error: ${err.message}`);
    }
    await sleep(POLL_SECONDS * 1000);
  }
}

/** Stop claiming new jobs. run() returns once in-flight jobs are done. */
export function stop(reason) {
  log('🛑', `${reason}: no new jobs, waiting for ${active.size} in flight`);
  stopping = true;
}
