-- CreateEnum
CREATE TYPE "JobState" AS ENUM ('queued', 'rejected', 'building', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "repo_url" TEXT NOT NULL,
    "state" "JobState" NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "building_at" TIMESTAMP(3),
    "running_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jobs_state_created_at_idx" ON "jobs"("state", "created_at");
