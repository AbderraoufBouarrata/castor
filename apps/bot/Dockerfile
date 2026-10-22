# =============================================================================
# castor-bot
#
# No dependencies and no database access: plain Node and the bot's own files.
# Run exactly one replica per BOT_TOKEN (a second poller gets 409 Conflict).
#
# Build from the repo root, like the other images:
#   docker build -f apps/bot/Dockerfile -t castor-bot .
#   docker run --rm -e BOT_TOKEN=... -e API_URL=http://job-api:3000 -e API_TOKEN=... castor-bot
#
# One-time profile and command menu setup, from the same image:
#   docker run --rm -e BOT_TOKEN=... castor-bot node config/setup.js
# =============================================================================

FROM node:24-slim
WORKDIR /app/apps/bot
ENV NODE_ENV=production

COPY apps/bot ./

USER node
CMD ["node", "index.js"]
