# =============================================================================
# castor-migrate: applies database migrations, then exits.
#
# Run it before deploying the apps (in Kubernetes: a Job or an initContainer).
# Build from the repo root:
#   docker build -f packages/db/Dockerfile -t castor-migrate .
#   docker run --rm -e DATABASE_URL=... castor-migrate
# =============================================================================

FROM node:24-slim
WORKDIR /app

# Workspace manifests first, so the install layer is cached until they change.
COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
COPY apps/job-api/package.json apps/job-api/
COPY apps/dispatcher/package.json apps/dispatcher/
COPY apps/reaper/package.json apps/reaper/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/

# Dev deps included: the Prisma CLI is what this image runs.
RUN npm ci -w @castor/db

COPY packages/db packages/db

USER node
WORKDIR /app/packages/db
CMD ["npx", "prisma", "migrate", "deploy"]
