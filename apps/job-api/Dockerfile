# =============================================================================
# castor-job-api
#
# Build from the repo root (the image needs packages/db):
#   docker build -f apps/job-api/Dockerfile -t castor-job-api .
#   docker run --rm -p 3000:3000 -e DATABASE_URL=... -e API_TOKEN=... castor-job-api
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
RUN npm ci --omit=dev -w @castor/job-api

COPY packages/db packages/db
COPY --from=build /app/packages/db/generated packages/db/generated
COPY apps/job-api apps/job-api

USER node
WORKDIR /app/apps/job-api
EXPOSE 3000
CMD ["node", "index.js"]
