# syntax=docker/dockerfile:1.6
FROM node:22-alpine AS base

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /app

# Copy workspace config and lockfile first for cache-efficient layering
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy package.json for each workspace member so pnpm links correctly
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

# BuildKit cache mount so pnpm store isn't re-fetched on rebuild
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build ----
FROM deps AS builder
WORKDIR /app

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN pnpm --filter web build

# ---- Serve ----
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html

# Proxy /api requests to the API container
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
