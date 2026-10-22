// Prisma CLI config (migrate, generate). The app itself never reads this file.
import { defineConfig } from 'prisma/config';

// Load .env for local dev. Missing file is fine: in k8s env comes from the pod.
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
