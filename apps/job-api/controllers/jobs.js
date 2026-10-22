// =============================================================================
// Jobs controller
//
// HTTP layer: routes, their DTOs and auth, and the handlers. Handlers read the
// validated request, call the service and shape the reply. No database access
// and no business rules here. Mounted under the '/api/v1' prefix in app.js.
// =============================================================================

import * as service from '../services/jobs.js';
import { requireToken } from '../hooks/auth.js';
import { createJobDto, listJobsDto, jobChangesDto, getJobDto } from '../dtos/jobs.dto.js';

// -----------------------------------------------------------------------------
// Routes
// -----------------------------------------------------------------------------

export async function jobsController(app) {
  // Write (bot only)
  app.post('/jobs', { schema: createJobDto, onRequest: requireToken }, create);

  // Read (public: bot and status page)
  app.get('/jobs', { schema: listJobsDto }, list);
  app.get('/jobs/changes', { schema: jobChangesDto }, changes);
  app.get('/jobs/:id', { schema: getJobDto }, get);
}

// -----------------------------------------------------------------------------
// Presenter
// -----------------------------------------------------------------------------

/**
 * Job as sent over the wire.
 * - phone is dropped: GET /api/v1/jobs is public (status page).
 * - telegramUserId is a BigInt in the DB, which JSON can't encode; Telegram ids
 *   fit in 52 bits, so a number is exact.
 */
function present({ phone, telegramUserId, ...job }) {
  return { ...job, telegramUserId: Number(telegramUserId) };
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/** POST /api/v1/jobs → 201 with the new job (state queued or waiting). */
async function create(req, reply) {
  const job = await service.submitJob(req.body);
  return reply.code(201).send(present(job));
}

/** GET /api/v1/jobs → jobs newest first. Optional filters: telegramUserId, state, limit. */
async function list(req) {
  const jobs = await service.listJobs(req.query);
  return jobs.map(present);
}

/** GET /api/v1/jobs/changes?since= → jobs updated after `since`, oldest change first. The bot polls this. */
async function changes(req) {
  const jobs = await service.listJobChanges(req.query);
  return jobs.map(present);
}

/** GET /api/v1/jobs/:id → the job, or 404. */
async function get(req, reply) {
  const job = await service.getJob(req.params.id);
  if (!job) return reply.code(404).send({ error: 'job not found' });
  return present(job);
}
