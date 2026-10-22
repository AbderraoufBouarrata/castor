// =============================================================================
// /jobs DTOs
//
// JSON Schema checked by Fastify before a controller runs. Bad input gets a
// 400 and never reaches the database.
// =============================================================================

import { JobState } from '../db.js';

// -----------------------------------------------------------------------------
// Shared fields
// -----------------------------------------------------------------------------

/** Public GitHub repository URL: https://github.com/<owner>/<repo>. */
const repoUrl = { type: 'string', maxLength: 200, pattern: '^https://github\\.com/[\\w.-]+/[\\w.-]+/?$' };

/** Telegram user ids are positive and fit in 52 bits, so a JSON number is safe. */
const telegramUserId = { type: 'integer', minimum: 1 };

const phone = { type: 'string', pattern: '^\\+?[0-9]{5,20}$' };

const state = { type: 'string', enum: Object.values(JobState) };

// -----------------------------------------------------------------------------
// Route DTOs
// -----------------------------------------------------------------------------

export const createJobDto = {
  body: {
    type: 'object',
    required: ['telegramUserId', 'repoUrl'],
    additionalProperties: false,
    properties: { telegramUserId, phone, repoUrl },
  },
};

export const listJobsDto = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      telegramUserId,
      state,
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
  },
};

export const getJobDto = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } },
  },
};
