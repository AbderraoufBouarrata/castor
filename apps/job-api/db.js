// =============================================================================
// Database client
//
// One shared Prisma client for the whole app. Prisma 7 talks to Postgres
// through a driver adapter (node-postgres), configured from DATABASE_URL.
// =============================================================================

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set (see .env.example)');

// -----------------------------------------------------------------------------
// Client
// -----------------------------------------------------------------------------

/** Shared Prisma client. Import this; never construct another one. */
export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

export { JobState } from './generated/prisma/client.ts';
