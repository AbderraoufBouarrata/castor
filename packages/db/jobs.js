// =============================================================================
// Shared job transitions
//
// State changes that more than one app makes and that must behave the same
// everywhere. The dispatcher finishes jobs it ran; the reaper finishes jobs
// left stuck. Both go through finishJob so the next waiting job is always
// promoted the same way.
// =============================================================================

import { db, JobState } from './client.js';

/**
 * Move a building/running job to done or failed, then promote the same user's
 * oldest waiting job into the queue.
 *
 * Returns { finished, promoted }:
 *   finished  false if the job was no longer building/running (someone else
 *             finished it first); nothing changed.
 *   promoted  the job moved from waiting to queued, or null.
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
    if (count === 0) return { finished: false, promoted: null };

    const [next] = await tx.$queryRaw`
      SELECT id FROM jobs
      WHERE telegram_user_id = ${job.telegramUserId} AND state = 'waiting'
      ORDER BY created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED`;
    if (!next) return { finished: true, promoted: null };

    const promoted = await tx.job.update({
      where: { id: next.id },
      data: { state: JobState.queued, queuedAt: new Date() },
    });
    return { finished: true, promoted };
  });
}
