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

/**
 * Move a building/running job to done or failed, then promote the same user's
 * oldest waiting job into the queue. Returns the promoted job, or null.
 *
 * One transaction, in this order: the finish frees the user's active slot
 * (jobs_one_active_per_user), the promotion takes it. A submit racing with
 * this either sees the promoted job and becomes waiting, or sees no waiting
 * job and is queued itself; never both queued.
 */
export function finishJob(job, state, error = null) {
  return db.$transaction(async (tx) => {
    const { count } = await tx.job.updateMany({
      where: { id: job.id, state: { in: [JobState.building, JobState.running] } },
      data: { state, error, finishedAt: new Date() },
    });
    if (count === 0) return null;

    const [next] = await tx.$queryRaw`
      SELECT id FROM jobs
      WHERE telegram_user_id = ${job.telegramUserId} AND state = 'waiting'
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (!next) return null;

    return tx.job.update({
      where: { id: next.id },
      data: { state: JobState.queued, queuedAt: new Date() },
    });
  });
}
