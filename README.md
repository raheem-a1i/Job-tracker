# Job Market Signal Tracker

Scrapes job postings from scraper-friendly boards, extracts skills, classifies
roles/seniority, and parses salary bands from raw posting text, then surfaces
trends — top skills, salary bands, rising technologies — in an interactive React
dashboard. No API keys required; runs end-to-end for free.

## Stack

- **Backend:** Node + Express. Pluggable source adapters, extraction, JSON-file
  storage, trend analytics.
- **Frontend:** React + Vite + Chart.js.
- **Extraction:** a rule-based heuristic by default, or an optional **in-process
  AI model** (Transformers.js zero-shot classifier) for role classification —
  both run locally, no external API. Per-job fallback to the heuristic.

## Sources

Public, scraper-friendly endpoints (no terms-of-service issues):

- **Remotive** — `https://remotive.com/api/remote-jobs` (keyless)
- **RemoteOK** — `https://remoteok.com/api` (keyless)
- **Arbeitnow** — `https://www.arbeitnow.com/api/job-board-api` (keyless)
- **Adzuna** — `https://api.adzuna.com` (free API key required; aggregator with salary data)
- **sample** — a bundled offline dataset so the pipeline works with no network.

LinkedIn / Indeed are intentionally not supported: their terms prohibit scraping
and they employ anti-bot defenses. Use the aggregators above instead.

Add a board by dropping an adapter in `server/src/sources/` and registering it in
`server/src/sources/index.js`.

## Setup

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. (Optional) enable the in-process AI model
cp .env.example .env
#   then set AI_PROVIDER=local  (otherwise the free heuristic is used)

# 3. Run backend + frontend together
npm run dev
```

- Dashboard: http://localhost:5173
- API: http://localhost:4000

On first boot the backend auto-runs one refresh so the dashboard isn't empty.
Click **Refresh data** in the UI to scrape + re-extract at any time.

### Offline / no-network

Set `SOURCES=sample` in `.env` to use only the bundled dataset.

### CLI refresh

```bash
npm run refresh        # scrape + extract once, then exit
```

## Deployment (single host)

The whole app runs as one Node service — Express serves both the API and the
built React app from the same origin. Works on Render, Railway, Fly.io, or any
VPS. Requires Node ≥ 22.

- **Build command:** `npm run build` (installs deps + builds the client)
- **Start command:** `npm start`
- **Env vars:** set `SOURCES`, `ADZUNA_*`, `AI_PROVIDER`, etc. in the host's
  dashboard — not a committed `.env`.

### Render (one click)

This repo includes [`render.yaml`](render.yaml). In Render: **New → Blueprint**,
select the repo and deploy.

### Persistence note

Job/history data lives in JSON files under `server/data` (or `DATA_DIR`). On
hosts with an **ephemeral** filesystem, that data resets on redeploy/restart —
the app simply re-seeds real postings on next boot, but **demand history won't
survive redeploys**. To keep it, mount a persistent disk/volume and point
`DATA_DIR` at it (the Render blueprint does this at `/data`).

### GitHub

Push as-is. `.gitignore` already excludes `node_modules`, `.env`, and
`server/data/*.json`, so secrets and local data are never committed.

## Configuration (`.env`)

| Variable            | Default            | Purpose                                            |
| ------------------- | ------------------ | -------------------------------------------------- |
| `AI_PROVIDER`       | `heuristic`        | `local` = in-process AI model; `heuristic` = rule-based. |
| `LOCAL_AI_MODEL`    | `Xenova/nli-deberta-v3-small` | Model id for `AI_PROVIDER=local`.       |
| `AI_MAX_JOBS`       | `60`               | Max postings sent to the local model per refresh.  |
| `SOURCES`           | `remotive,remoteok`| Comma-separated source adapters.                   |
| `SOURCE_LIMIT`      | `80`               | Max postings fetched per source.                   |
| `PORT`              | `4000`             | Server port (hosts inject their own).              |
| `DATA_DIR`          | `server/data`      | Where JSON data is stored; point at a mounted disk for persistence. |

## Extraction providers

Set `AI_PROVIDER` in `.env` to choose how postings are analyzed:

| `AI_PROVIDER` | Extractor | Cost | Notes |
| ------------- | --------- | ---- | ----- |
| `heuristic` (default) | Rule-based only | Free | No model download; works anywhere |
| `local` | In-process AI model + heuristic | Free | Runs on this host; needs ~1 GB RAM |

### Local (in-process) AI

`AI_PROVIDER=local` runs a small **zero-shot classification model** on this
machine (via Transformers.js / ONNX) to classify each posting's **role** — no
API key, no external service. Seniority, skills, and salary stay on the
deterministic heuristic (regex nails those more reliably than a tiny model).

- The model (`LOCAL_AI_MODEL`, default `Xenova/nli-deberta-v3-small`, ~140 MB)
  downloads once on first refresh and is cached locally; afterwards it's offline.
- Needs ~1 GB free RAM; runs on CPU (~100 ms/posting after a one-time warm-up).
- Best run **locally** or on a host with ≥1 GB RAM (e.g. Railway). It won't fit
  a 512 MB free tier — the app auto-falls back to the heuristic if the model
  can't load, so it never crashes a deploy.

```bash
# Run entirely locally with in-process AI, no API key:
echo "AI_PROVIDER=local" >> .env
npm run dev
```

## How extraction works

Each posting is turned into structured fields — **skills, role, seniority, salary
band, work mode (remote/hybrid/onsite), years of experience, and a one-line
summary** — against a shared taxonomy (`server/src/ai/taxonomy.js`) so results
aggregate cleanly. The default **heuristic** extractor (`heuristic.js`) derives
these with regex/keyword rules. With `AI_PROVIDER=local`, the in-process model
(`local.js`) classifies the **role** instead, falling back to the heuristic per
posting on any failure — so every posting always gets a result. The postings table
also shows each job's location and posted date.

## API

| Endpoint              | Description                                        |
| --------------------- | ------------------------------------------------- |
| `GET /api/status`     | Health, active provider, last refresh, progress, full skill taxonomy. |
| `GET /api/jobs`       | Filtered postings (`role`, `seniority`, `source`, `skill`, `q`). |
| `GET /api/trends`     | Aggregated trends + filter facet values.          |
| `GET /api/skill-graph`| Skill co-occurrence graph (counts + pairs) over all postings. |
| `GET /api/history`    | Dated demand snapshots for the time-series chart. |
| `POST /api/refresh`   | Trigger a scrape + extract (async; poll status).  |

## Personalized features

Pick up to 5 skills in **My Skills** (saved in your browser) to unlock:

- **Skill gap & recommendations** — "next skill to learn", scored by how often a
  skill pairs with skills you already have (co-occurrence) blended with market
  demand, plus your coverage of the top-15 in-demand skills.
- **Job match score** — each posting is scored by the share of your skills it
  requires; sort the table by best match and see matched skills highlighted.
- **Demand over time** — every refresh records a snapshot to `data/history.json`,
  so the line chart shows genuine demand trends for your skills as data accrues
  (run refreshes over time, e.g. via a daily cron).

## Project layout

```
server/src/
  sources/      source adapters (remotive, remoteok, sample) + registry
  ai/           taxonomy, heuristic.js, local.js (model), extract.js (orchestrator)
  store/        jsonStore.js (atomic JSON persistence)
  pipeline.js   scrape → extract → save
  analytics.js  trend computation
  index.js      Express API
client/src/
  components/    charts, filters, cards, table
  App.jsx        dashboard
```
