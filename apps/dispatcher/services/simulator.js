// =============================================================================
// Simulator
//
// Stands in for the worker VM: walks one claimed job through building and
// running with sleeps, failing at random. The real dispatcher replaces this
// file with Proxmox calls; services/jobs.js stays the same.
//
//   building → running → done
//          ↘ failed  ↘ failed
// =============================================================================

import { setTimeout as sleep } from 'node:timers/promises';
import { JobState } from '@castor/db';
import { STEP_SECONDS, FAIL_RATE } from '../config.js';
import { log, short } from '@castor/core';
import { elapsed, logPromotion } from '../helpers/log.js';
import { markRunning, finishJob } from './jobs.js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Sleep for one phase: STEP to 2×STEP seconds. */
const phase = () => sleep((STEP_SECONDS + Math.random() * STEP_SECONDS) * 1000);

/** Mark the job failed, log it and the job it promoted. */
async function fail(job, error) {
  log('❌', `job ${short(job)} → failed after ${elapsed(job)}: ${error}`);
  logPromotion(await finishJob(job, JobState.failed, error));
}

// -----------------------------------------------------------------------------
// Simulate
// -----------------------------------------------------------------------------

/** Walk one claimed (building) job to done or failed. */
export async function simulate(job) {
  log('🔨', `job ${short(job)} → building`);
  await phase();

  const fails = Math.random() < FAIL_RATE;
  const failsAtBuild = fails && Math.random() < 0.5;
  // Errors follow the "source: message" convention (see packages/db README).
  if (failsAtBuild) return fail(job, 'dispatcher: docker build exited with code 1 (simulated)');

  if (!(await markRunning(job.id))) return log('⚠️', `job ${short(job)} is no longer building, leaving it`);
  log('🚀', `job ${short(job)} → running`);
  await phase();

  if (fails) return fail(job, 'dispatcher: container exited with code 1 (simulated)');

  log('✅', `job ${short(job)} → done in ${elapsed(job)}`);
  logPromotion(await finishJob(job, JobState.done));
}
