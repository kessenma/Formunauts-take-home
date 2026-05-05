# Formunauts Donation Dashboard

A full-stack donation management platform built as a take-home assessment. Features a real-time donation feed, multi-campaign analytics, an AI-powered query chat, and a live system health monitor.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 — standalone components, Signals, `httpResource`, OnPush everywhere |
| Backend | Bun + ElysiaJS — typed routes, WebSocket, built-in Redis/Postgres clients |
| LLM Service | Python + FastAPI — runs Qwen2.5-Coder-1.5B locally via llama-cpp |
| Database | PostgreSQL 16 with Drizzle ORM |
| Cache / Pub-Sub | Redis 7 — session cache, WebSocket fan-out, spike debounce |
| Auth | better-auth — session tokens cached in Redis |
| Shared types | `@formunauts/shared` — plain TS interfaces, no framework deps |
| Monorepo | pnpm workspaces |
| Infra | Docker Compose (one file per service) |

---

## Project Structure

```
formunauts-donation-dashboard/
├── apps/
│   ├── api/             # Bun + ElysiaJS API on :3000
│   ├── llm-service/     # Python FastAPI LLM service on :8000
│   └── web/             # Angular 21 SPA on :4200
├── packages/
│   └── shared/          # Shared TS interfaces & theme tokens
├── docker-compose.db.yml
├── docker-compose.api.yml
└── docker-compose.web.yml
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- [pnpm](https://pnpm.io) ≥ 10
- [Docker](https://www.docker.com) (for Postgres + Redis)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy and fill in the API env file:

```bash
cp apps/api/.env.example apps/api/.env
```

Key variables:

```env
DATABASE_URL=postgres://app:secret@localhost:5432/formunauts
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=your-secret-here
```

### 3. Start everything

```bash
pnpm dev
```

This runs Postgres + Redis in Docker, the Bun API on `:3000`, and the Angular dev server on `:4200` (with a proxy that forwards `/api` including WebSocket upgrades).

### 4. Seed the database

```bash
pnpm -F api db:push   # apply schema
pnpm -F api db:seed   # insert sample data
```

Open [http://localhost:4200](http://localhost:4200).

---

## Features

### Dashboard

Selectable campaign view with a progress card and four charts:

- Donations over time (bar chart)
- Donations by channel
- Donations by payment method
- Fundraiser leaderboard

### Query

A tabbed data explorer across five entity types — **Donations, Donors, Fundraisers, Campaigns, Organizations** — with:

- Server-side pagination (up to 100 rows/page) or infinite scroll
- Column sort, filter bar per entity
- Live mode toggle: WebSocket pushes new donations straight into the table without a page refresh

### Chat

A floating AI chat panel available on every page. Ask questions in plain English — the LLM service converts them to PostgreSQL SELECT queries which are executed against the live database and rendered as tables inline. Features slash-mention commands, session persistence, and shareable conversation links.

### Conversations

Full team conversation history at `/conversations`. Expand any session to read its message thread, view generated SQL, and send follow-up questions. Sessions can be shared via a public token link. A model-loading notice is shown when the LLM service is still warming up.

### Settings

A developer control centre with five sections:

| Section | What it does |
|---|---|
| System Status | Live health check for Server, Database, and LLM — auto-refreshes every 5 s |
| Setup | Step-by-step forms to create Organizations → Campaigns → Fundraisers → Donations (single or bulk CSV/XLSX upload) |
| Donation Stream | Start/stop a server-side tick that inserts synthetic donations and broadcasts them via WebSocket |
| Mock Data | Generate thousands of random donations for load testing; delete them with one click |
| Spike History | Auto-recorded threshold breaches (CPU, memory, response time) with severity badges |

---

## LLM Service

`apps/llm-service` is a standalone Python FastAPI app that runs a local language model for natural-language-to-SQL.

**Model:** [Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF) (Q4_K_M quantization, ~1 GB) — downloaded from HuggingFace on first start and cached in a Docker volume.

**How it works:** The chat panel sends a plain-English question to `/sql`. The service prepends a system prompt containing the full database schema and query rules, runs inference via `llama-cpp-python`, strips any markdown fences from the output, and returns a bare `SELECT` statement. The API then executes that query and streams results back to the client.

**Download lifecycle:** The model is streamed in the background so the service is immediately reachable (for `/status` and `/health`) while downloading. Download can be paused and resumed via `POST /pause` / `POST /resume`. Progress is exposed on `/status` and surfaced in the Settings → System Status panel.

**LLM service routes:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/sql` | Convert a question to a SQL SELECT query |
| `GET` | `/status` | Phase, download progress, model loaded flag |
| `GET` | `/health` | Liveness check |
| `POST` | `/pause` | Pause an in-progress model download |
| `POST` | `/resume` | Resume a paused download |

The service only emits `SELECT` statements. Mock data is automatically excluded from results unless the question explicitly requests it.

---

## Architecture Highlights

**Performance at scale** — All donation queries are server-side paginated with DB indexes on `campaign_id + date`, `donor_id`, `channel`, and `is_mock`. Generating 5 000+ mock rows and paginating stays fast.

**Real-time** — A WebSocket at `/api/donations/live` fans out new donations to all connected clients instantly via Redis pub/sub. Mutations re-use the WebSocket event instead of an extra HTTP call.

**State & caching** — Angular components use `ChangeDetectionStrategy.OnPush` and signals. Shared state lives in root-level services using `httpResource`, which caches the last response and deduplicates requests. Health data uses `shareReplay(1)`.

**Auth** — better-auth sessions are cached in Redis (`secondaryStorage`), so there are zero Postgres lookups per request after first login. Route guards enforce auth on the client; the API validates every request server-side.

**Spike detection** — Redis `SET NX EX` deduplicates health threshold breaches with a 60-second cooldown per metric, safe across multiple API replicas.

---

## API

The API implements and extends the assessment spec. Key routes:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/campaign` | Active campaign summary |
| `GET` | `/api/donations` | Paginated donations with filter/sort |
| `POST` | `/api/donations` | Create donation + broadcast via WebSocket |
| `WS` | `/api/donations/live` | Real-time donation feed |
| `GET` | `/api/health` | System health (server, DB, LLM) |

See [MOCK_API.md](MOCK_API.md) for the full spec and field-level delta notes.

---

## Design System

Notion-inspired "midnight machine" theme — deep indigo backdrop, precise Lochmara blue (`#0074C8`) for interactive elements, Figtree typeface. Supports light/dark mode with an animated theme toggle. Full token reference in [DESIGN.md](DESIGN.md).

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Postgres, Redis, API, and Angular dev server |
| `pnpm test` | Run Angular unit tests (Vitest) |
| `pnpm build` | Production build for all packages |
| `pnpm -F api db:push` | Push Drizzle schema to Postgres |
| `pnpm -F api db:seed` | Seed sample data |
| `pnpm docker:db` | Start Postgres + Redis only |
| `pnpm docker:api` | Build and start API container |
| `pnpm kill:all` | Kill API (:3000) and web (:4200) dev processes |
