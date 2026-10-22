// =============================================================================
// /api/v1/jobs request checks that never reach the database: auth and validation.
// Run: npm test
// =============================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';

const app = buildApp({ logger: false });
const auth = { authorization: `Bearer ${process.env.API_TOKEN}` };
const body = { telegramUserId: 111222333, repoUrl: 'https://github.com/x/y' };

test('POST /api/v1/jobs without token → 401', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: body });
  assert.equal(res.statusCode, 401);
});

test('POST /api/v1/jobs without token and without body → 401, not 400', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs' });
  assert.equal(res.statusCode, 401);
});

test('POST /api/v1/jobs with wrong token → 401', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: body, headers: { authorization: 'Bearer nope' } });
  assert.equal(res.statusCode, 401);
});

test('POST /api/v1/jobs with non-GitHub repo → 400', async () => {
  const payload = { ...body, repoUrl: 'https://evil.example/x/y' };
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload, headers: auth });
  assert.equal(res.statusCode, 400);
});

test('POST /api/v1/jobs without telegramUserId → 400', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: { repoUrl: body.repoUrl }, headers: auth });
  assert.equal(res.statusCode, 400);
});

test('GET /api/v1/jobs with bad state → 400', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/jobs?state=nope' });
  assert.equal(res.statusCode, 400);
});

test('GET /api/v1/jobs/:id with non-uuid → 400', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/jobs/123' });
  assert.equal(res.statusCode, 400);
});

test.after(() => app.close());
