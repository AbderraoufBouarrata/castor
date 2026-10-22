// =============================================================================
// Dispatcher log helpers
//
// Dispatcher-specific bits. The line format itself (log, short) comes from
// @castor/core, shared with the reaper.
// =============================================================================

import { log, short } from '@castor/core';

/** "https://github.com/owner/repo" → "owner/repo". */
export const repoName = (job) => new URL(job.repoUrl).pathname.replace(/^\/|\/$|\.git$/g, '');

/** Seconds since the job started building, e.g. "12s". */
export const elapsed = (job) => `${Math.round((Date.now() - job.buildingAt) / 1000)}s`;

/** Log the job a finish promoted into the queue, if any. Takes finishJob's result. */
export const logPromotion = ({ promoted }) =>
  promoted && log('⏫', `job ${short(promoted)} → queued (user ${promoted.telegramUserId}'s next job)`);
