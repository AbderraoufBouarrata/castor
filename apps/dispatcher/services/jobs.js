// =============================================================================
// Job state changes
//
// Every database read and write the dispatcher makes. Each move is guarded by
// the state it expects (`where: { state: from }`), so a job another component
// already moved (e.g. the reaper) is left alone instead of overwritten.
// =============================================================================

import { db, JobState } from '@castor/db';

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------

/** How many jobs are queued and waiting right now. For logs. */
export async function countPending() {
  const [queued, waiting] = await Promise.all([
    db.job.count({ where: { state: JobState.queued } }),
    db.job.count({ where: { state: JobState.waiting } }),
  ]);
  return { queued, waiting };
}

// -----------------------------------------------------------------------------
// Claim
// -----------------------------------------------------------------------------

/**
 * Take the job that entered the queue first and mark it building. Returns the
 * job, or null if the queue is empty.
 *
 * FOR UPDATE SKIP LOCKED: two dispatchers never get the same job; each skips
 * rows the other has locked instead of waiting on them.
 */
export function claimNextJob() {
  return db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw`
      SELECT id FROM jobs
      WHERE state = 'queued'
      ORDER BY queued_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (!row) return null;

    return tx.job.update({
      where: { id: row.id },
      data: { state: JobState.building, buildingAt: new Date() },
    });
  });
}

// -----------------------------------------------------------------------------
// Progress
// -----------------------------------------------------------------------------

/** building → running. False if the job was no longer building. */
export async function markRunning(id) {
  const { count } = await db.job.updateMany({
    where: { id, state: JobState.building },
    data: { state: JobState.running, runningAt: new Date() },
  });
  return count === 1;
}

// -----------------------------------------------------------------------------
// Finish
// -----------------------------------------------------------------------------

/** done/failed + promote the user's next waiting job. Shared with the reaper. */
export { finishJob } from '@castor/db';
