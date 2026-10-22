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

test('GET /api/v1/jobs/changes without since → 400', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/jobs/changes' });
  assert.equal(res.statusCode, 400);
});

test('GET /api/v1/jobs/:id with non-uuid → 400', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/v1/jobs/123' });
  assert.equal(res.statusCode, 400);
});

// -----------------------------------------------------------------------------
// Dockerfile check (GitHub mocked; these fail before the database is touched)
// -----------------------------------------------------------------------------

const realFetch = globalThis.fetch;
const mockGitHub = (impl) => { globalThis.fetch = impl; };
test.afterEach(() => { globalThis.fetch = realFetch; });

/** Fake GitHub: `pages` maps URL → status; anything else 404. Records requested URLs. */
const fakeGitHub = (pages) => {
  const asked = [];
  mockGitHub(async (url) => { asked.push(url); return { status: pages[url] ?? 404 }; });
  return asked;
};

test('POST /api/v1/jobs for public repo without root Dockerfile → 422 NO_DOCKERFILE', async () => {
  const asked = fakeGitHub({ 'https://github.com/x/y': 200 });
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: { ...body, repoUrl: 'https://github.com/x/y.git' }, headers: auth });
  assert.equal(res.statusCode, 422);
  assert.equal(res.json().code, 'NO_DOCKERFILE');
  assert.deepEqual(asked, ['https://raw.githubusercontent.com/x/y/HEAD/Dockerfile', 'https://github.com/x/y']);
});

test('POST /api/v1/jobs for private or missing repo → 422 REPO_NOT_FOUND', async () => {
  fakeGitHub({});
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: body, headers: auth });
  assert.equal(res.statusCode, 422);
  assert.equal(res.json().code, 'REPO_NOT_FOUND');
});

test('POST /api/v1/jobs when GitHub is unreachable → 502', async () => {
  mockGitHub(async () => { throw new TypeError('fetch failed'); });
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: body, headers: auth });
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().code, 'GITHUB_UNREACHABLE');
});

test('POST /api/v1/jobs when GitHub rate-limits → 502', async () => {
  mockGitHub(async () => ({ status: 429 }));
  const res = await app.inject({ method: 'POST', url: '/api/v1/jobs', payload: body, headers: auth });
  assert.equal(res.statusCode, 502);
});

test.after(() => app.close());
