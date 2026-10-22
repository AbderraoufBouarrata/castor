/*
  Warnings:

  - Added the required column `telegram_user_id` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "JobState" ADD VALUE 'waiting';

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "queued_at" TIMESTAMPTZ(3),
ADD COLUMN     "telegram_user_id" BIGINT NOT NULL,
ALTER COLUMN "state" SET DEFAULT 'waiting',
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "building_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "running_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "finished_at" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "jobs_telegram_user_id_state_created_at_idx" ON "jobs"("telegram_user_id", "state", "created_at");
