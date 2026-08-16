# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS base
WORKDIR /app

COPY package.json bun.lock bunfig.toml              ./
COPY packages/paradise-models/package.json          packages/paradise-models/
COPY packages/vendor/uberstrike-js/package.json     packages/vendor/uberstrike-js/
COPY packages/ws/package.json                       packages/ws/

ENV NODE_TLS_REJECT_UNAUTHORIZED=0
RUN bun install --production --frozen-lockfile

COPY --exclude=src packages/paradise-models               packages/paradise-models
COPY --exclude=src packages/vendor/uberstrike-js          packages/vendor/uberstrike-js
COPY --exclude=wwwroot/updates packages/ws                 packages/ws

WORKDIR /app/packages/ws

EXPOSE 8080 8081 8082
CMD ["bun", "start", "--", "--service"]
