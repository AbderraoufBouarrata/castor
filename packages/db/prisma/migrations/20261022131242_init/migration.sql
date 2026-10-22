-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('waiting', 'queued', 'rejected', 'building', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "phone" TEXT,
    "repo_url" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'waiting',
    "error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queued_at" TIMESTAMPTZ(3),
    "building_at" TIMESTAMPTZ(3),
    "running_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_state_queued_at_idx" ON "jobs"("state", "queued_at");

-- CreateIndex
CREATE INDEX "jobs_telegram_user_id_state_created_at_idx" ON "jobs"("telegram_user_id", "state", "created_at");

-- CreateIndex
CREATE INDEX "jobs_updated_at_idx" ON "jobs"("updated_at");

-- One active job per user: at most one row per telegram_user_id in
-- queued/building/running. Prisma can't express partial indexes, so it lives
-- here. Submissions rely on it: a unique violation means "make it waiting".
CREATE UNIQUE INDEX "jobs_one_active_per_user" ON "jobs"("telegram_user_id")
WHERE "state" IN ('queued', 'building', 'running');
