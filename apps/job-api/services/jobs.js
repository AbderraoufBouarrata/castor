// =============================================================================
// Jobs service
//
// Business rules for jobs. The only layer that talks to the database.
// =============================================================================

import { db, JobState } from '../db.js';

// -----------------------------------------------------------------------------
// Submit
// -----------------------------------------------------------------------------

/**
 * Create a job for a user.
 *
 * A user may have one active job (queued, building or running). The partial
 * unique index jobs_one_active_per_user enforces that in the database, so we
 * try to queue the job directly; if the index rejects it, the user already has
 * an active job and this one waits behind it. Doing it this way (instead of
 * "check, then insert") is safe when two submits arrive at the same moment.
 */
export async function submitJob({ telegramUserId, phone, repoUrl }) {
  const data = { telegramUserId: BigInt(telegramUserId), phone, repoUrl };
  try {
    return await db.job.create({ data: { ...data, state: JobState.queued, queuedAt: new Date() } });
  } catch (err) {
    if (err.code !== 'P2002') throw err; // P2002 = unique constraint violation
    return db.job.create({ data: { ...data, state: JobState.waiting } });
  }
}

// -----------------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------------

/** Jobs newest first, optionally filtered by user and state. */
export function listJobs({ telegramUserId, state, limit }) {
  return db.job.findMany({
    where: {
      telegramUserId: telegramUserId === undefined ? undefined : BigInt(telegramUserId),
      state,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** One job by id, or null. */
export function getJob(id) {
  return db.job.findUnique({ where: { id } });
}
