// =============================================================================
// @castor/db
//
//   db, JobState   Prisma client and state enum   (client.js)
//   finishJob      finish a job + promote the next waiting one   (jobs.js)
// =============================================================================

export { db, JobState } from './client.js';
export { finishJob } from './jobs.js';
