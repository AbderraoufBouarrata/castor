# =============================================================================
# castor-dispatcher (fake)
#
# Build from the repo root (the image needs packages/db):
#   docker build -f apps/dispatcher/Dockerfile -t castor-dispatcher .
#   docker run --rm -e DATABASE_URL=... castor-dispatcher
# =============================================================================

# -----------------------------------------------------------------------------
# Build: generate the Prisma client (needs the Prisma CLI, a dev dependency)
# -----------------------------------------------------------------------------

FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
COPY apps/job-api/package.json apps/job-api/
COPY apps/dispatcher/package.json apps/dispatcher/
COPY apps/reaper/package.json apps/reaper/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
RUN npm ci -w @castor/db

COPY packages/db packages/db
# generate never connects; the URL only has to be present.
RUN cd packages/db && DATABASE_URL=postgresql://build@localhost/build npx prisma generate

# -----------------------------------------------------------------------------
# Runtime: production dependencies, the generated client, the app
# -----------------------------------------------------------------------------

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/bot/package.json apps/bot/
COPY apps/job-api/package.json apps/job-api/
COPY apps/dispatcher/package.json apps/dispatcher/
COPY apps/reaper/package.json apps/reaper/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
RUN npm ci --omit=dev -w @castor/dispatcher

COPY packages/core packages/core
COPY packages/db packages/db
COPY --from=build /app/packages/db/generated packages/db/generated
COPY apps/dispatcher apps/dispatcher

USER node
WORKDIR /app/apps/dispatcher
CMD ["node", "index.js"]
