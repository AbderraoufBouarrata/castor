// =============================================================================
// Jobs service
//
// Business rules for jobs. The only layer that talks to the database.
// =============================================================================

import { db, JobState } from '@castor/db';

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

/**
 * Error Fastify turns into a reply: { statusCode, code, error, message }.
 * `code` is stable and meant for clients (the bot picks its reply from it).
 */
const httpError = (statusCode, code, message) => Object.assign(new Error(message), { statusCode, code });

// -----------------------------------------------------------------------------
// Repo checks
//
// Both checks send a HEAD request to public GitHub pages: no token needed and
// not subject to the 60 requests/hour limit of the GitHub REST API.
// Without a token GitHub answers 404 for private and missing repos alike, so
// the two cases can't be told apart.
// -----------------------------------------------------------------------------

/** "https://github.com/<owner>/<repo>[.git][/]" → { owner, repo }. URL already validated by the DTO. */
function parseRepoUrl(repoUrl) {
  const [owner, repo] = new URL(repoUrl).pathname.split('/').filter(Boolean);
  return { owner, repo: repo.replace(/\.git$/, '') };
}

/** HEAD `url`: true on 200, false on 404. Throws 502 if GitHub is unreachable or answers anything else. */
async function exists(url) {
  let res;
  try {
    res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
  } catch {
    throw httpError(502, 'GITHUB_UNREACHABLE', 'Could not reach GitHub to check the repository');
  }
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  throw httpError(502, 'GITHUB_UNREACHABLE', `GitHub answered ${res.status} while checking the repository`);
}

/** True if the repo is public. False if it is private or does not exist. */
export function isPublicRepo(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  return exists(`https://github.com/${owner}/${repo}`);
}

/**
 * True if the repo has a file named exactly `Dockerfile` at its root, on the
 * default branch (HEAD). Checks existence only; a broken Dockerfile fails
 * later, at build time.
 */
export function hasRootDockerfile(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  return exists(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/Dockerfile`);
}

/**
 * Throw 422 unless the repo is buildable. Happy path costs one request; the
 * repo page is only checked to explain a missing Dockerfile.
 *   REPO_NOT_FOUND  private or does not exist
 *   NO_DOCKERFILE   public, but no Dockerfile at the root
 */
export async function assertBuildableRepo(repoUrl) {
  if (await hasRootDockerfile(repoUrl)) return;
  if (!(await isPublicRepo(repoUrl))) {
    throw httpError(422, 'REPO_NOT_FOUND', 'Repository is private or does not exist');
  }
  throw httpError(422, 'NO_DOCKERFILE', 'No Dockerfile at the root of the repository');
}

// -----------------------------------------------------------------------------
// Submit
// -----------------------------------------------------------------------------

/**
 * Create a job for a user. Rejects with 422 if the repo is private, missing or
 * has no root Dockerfile (see assertBuildableRepo).
 *
 * A user may have one active job (queued, building or running). The partial
 * unique index jobs_one_active_per_user enforces that in the database, so we
 * try to queue the job directly; if the index rejects it, the user already has
 * an active job and this one waits behind it. Doing it this way (instead of
 * "check, then insert") is safe when two submits arrive at the same moment.
 */
export async function submitJob({ telegramUserId, phone, repoUrl }) {
  await assertBuildableRepo(repoUrl);

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

/**
 * Change feed: jobs updated after `since`, oldest change first. Clients keep
 * the last updatedAt they saw as their next `since`.
 */
export function listJobChanges({ since, limit }) {
  return db.job.findMany({
    where: { updatedAt: { gt: new Date(since) } },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });
}

/** One job by id, or null. */
export function getJob(id) {
  return db.job.findUnique({ where: { id } });
}
