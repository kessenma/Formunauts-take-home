# syntax=docker/dockerfile:1.6
FROM oven/bun:1.3.4 AS base

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /app/apps/api

# Copy package manifests first — changes here invalidate the install layer,
# but source-only changes (in src/) reuse it
COPY apps/api/package.json apps/api/bun.lock ./

# bun treats apps/api as the workspace root (bun.lock lives here) and searches
# "./*" for workspace:* packages — it won't find packages/shared one level up.
# Strip the workspace dep before install; we wire the symlink explicitly below.
RUN sed -i '/"@formunauts\/shared"/d' package.json

# BuildKit cache mount keeps downloaded packages across rebuilds
RUN --mount=type=cache,target=/root/.bun/install/cache \
    BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache \
    bun install

# ---- Runner ----
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/apps/api/node_modules apps/api/node_modules

# Copy shared types and API source
COPY packages/shared packages/shared
COPY apps/api apps/api

# Replicate the pnpm workspace symlink — bun resolves @formunauts/shared via this
RUN mkdir -p apps/api/node_modules/@formunauts && \
    ln -sfn /app/packages/shared apps/api/node_modules/@formunauts/shared

WORKDIR /app/apps/api
EXPOSE 3000
# Push schema on every start (no-op if schema is current), then start server
CMD ["sh", "-c", "bun run db:push && bun src/index.ts"]
