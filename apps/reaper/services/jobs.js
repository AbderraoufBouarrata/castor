// =============================================================================
// Job queries
//
// The reaper works from job records only, never from another process's memory,
// so it can clean up after a dispatcher that has died.
// =============================================================================

import { db, JobState } from '@castor/db';
import { BUILD_TIMEOUT_SECONDS, TTL_SECONDS } from '../config.js';

/** Date `seconds` ago. */
const ago = (seconds) => new Date(Date.now() - seconds * 1000);

/**
 * Jobs stuck past their limit:
 * - building longer than BUILD_TIMEOUT_SECONDS
 * - running longer than TTL_SECONDS
 */
export function findStuckJobs() {
  return db.job.findMany({
    where: {
      OR: [
        { state: JobState.building, buildingAt: { lt: ago(BUILD_TIMEOUT_SECONDS) } },
        { state: JobState.running, runningAt: { lt: ago(TTL_SECONDS) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** done/failed + promote the user's next waiting job. Same transaction the dispatcher uses. */
export { finishJob } from '@castor/db';
