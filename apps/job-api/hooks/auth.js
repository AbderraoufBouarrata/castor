// =============================================================================
// Auth hook
//
// POST /api/v1/jobs makes the system run someone's code, so only the bot may call it.
// The bot sends `Authorization: Bearer <API_TOKEN>`.
// =============================================================================

import { timingSafeEqual } from 'node:crypto';

const { API_TOKEN } = process.env;
if (!API_TOKEN) throw new Error('API_TOKEN is not set (see .env.example)');

const expected = Buffer.from(`Bearer ${API_TOKEN}`);

/** onRequest hook (runs before body parsing and validation): reply 401 unless the request carries the API token. */
export async function requireToken(req, reply) {
  const given = Buffer.from(req.headers.authorization ?? '');
  // Constant-time compare so the token can't be guessed byte by byte.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
}
