// =============================================================================
// Entry point
//
// Builds the app and starts listening. Everything else lives in app.js so
// tests can build the app without opening a port.
// =============================================================================

import { buildApp } from './app.js';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const { PORT = 3000, HOST = '0.0.0.0' } = process.env;

// -----------------------------------------------------------------------------
// Start
// -----------------------------------------------------------------------------

const app = buildApp();

// Kubernetes stops pods with SIGTERM: finish in-flight requests, close the DB.
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => app.close());

await app.listen({ port: Number(PORT), host: HOST });
