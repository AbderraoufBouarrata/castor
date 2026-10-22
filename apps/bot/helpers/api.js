// =============================================================================
// Job API client
// =============================================================================

/**
 * Call the Job API under /api/v1. Sends API_TOKEN, which POST /jobs requires.
 * Returns { status, data } and leaves status handling to the caller.
 */
export async function api(method, path, body) {
  const { API_URL, API_TOKEN } = process.env;
  const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/v1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      ...(body && { 'content-type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}
