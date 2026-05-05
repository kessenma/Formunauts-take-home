# syntax=docker/dockerfile:1.6
FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# BuildKit cache mount for apt so package lists aren't re-fetched on rebuild
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy project metadata first so dependency install is cached independently of source changes
COPY pyproject.toml uv.lock ./

# BuildKit cache mount for uv — wheels are cached across rebuilds
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY main.py .

EXPOSE 8082

ENV MODEL_DIR=/models
ENV N_THREADS=4
ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]
