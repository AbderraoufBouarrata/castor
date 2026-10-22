// =============================================================================
// Fastify app
//
// Wires plugins and routes. Does not listen; index.js does that.
// =============================================================================

import Fastify from 'fastify';
import { db } from '@castor/db';
import { jobsController } from './controllers/jobs.js';

/** Build a configured app. `opts` are passed to Fastify (e.g. { logger: false } in tests). */
export function buildApp(opts = {}) {
  const app = Fastify({ logger: true, ...opts });

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  app.register(jobsController, { prefix: '/api/v1' });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  app.addHook('onClose', () => db.$disconnect());

  return app;
}
