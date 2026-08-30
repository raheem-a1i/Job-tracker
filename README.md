# Job Market Signal Tracker

Scrapes job postings from scraper-friendly boards, uses **Claude** to extract
skills, classify roles/seniority, and parse salary bands from raw posting text,
then surfaces trends — top skills, salary bands, demand over time — in an
interactive React dashboard. Includes a **Claude Job Fit Coach** that compares a
posting against your saved skills.

> Without an `ANTHROPIC_API_KEY`, extraction automatically falls back to a
> keyword heuristic, so the dashboard still runs end-to-end for free (the Job Fit
> Coach needs the key).

## Stack

- **Backend:** Node + Express. Pluggable source adapters, extraction, JSON-file
  storage, trend analytics.
- **Frontend:** React + Vite + Chart.js.
- **AI:** `@anthropic-ai/sdk`. Extraction uses Claude with structured outputs and
  a per-job fallback to the heuristic; the Job Fit Coach uses Claude on demand.

## Sources

Public, scraper-friendly endpoints (no terms-of-service issues):

- **Remotive** — `https://remotive.com/api/remote-jobs` (keyless)
- **RemoteOK** — `https://remoteok.com/api` (keyless)
- **Arbeitnow** — `https://www.arbeitnow.com/api/job-board-api` (keyless)
- **Adzuna** — `https://api.adzuna.com` (free API key required; aggregator with salary data)
- **sample** — a bundled offline dataset so the pipeline works with no network.

LinkedIn / Indeed / Wellfound / Handshake are intentionally not supported: their
terms prohibit scraping and they employ anti-bot / auth walls. Use the sources above.

Add a board by dropping an adapter in `server/src/sources/` and registering it in
`server/src/sources/index.js`.

## Setup

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. (Optional) enable Claude extraction + the Job Fit Coach
cp .env.example .env
#   then set ANTHROPIC_API_KEY=sk-ant-...  (otherwise the free heuristic is used)

# 3. Build the client, then run the app (one server for app + API)
npm run build
npm start
```

Open **http://localhost:4000** — a single Node server hosts both the dashboard
and the API. (`npm start` reads `.env`, so the extractor badge shows **Claude**
when `ANTHROPIC_API_KEY` is set.)

Prefer hot-reload while developing? Run `npm run dev` instead — Vite serves the
dashboard on http://localhost:5173 and proxies the API to http://localhost:4000.

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
- **Env vars:** set `ANTHROPIC_API_KEY`, `SOURCES`, `ADZUNA_*`, etc. in the host's
  dashboard — not a committed `.env`.

### Render (one click)

This repo includes [`render.yaml`](render.yaml). In Render: **New → Blueprint**,
select the repo, then set `ANTHROPIC_API_KEY` in the dashboard.

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
| `ANTHROPIC_API_KEY` | _(unset)_          | Enables Claude extraction + the Job Fit Coach. Absent → heuristic. |
| `CLAUDE_MODEL`      | `claude-sonnet-5`  | Extraction model (sonnet ≈5× cheaper than opus).   |
| `AI_MAX_JOBS`       | `60`               | Max postings sent to Claude per refresh (cost cap).|
| `AI_CONCURRENCY`    | `5`                | Parallel Claude requests.                          |
| `SOURCES`           | `remotive,remoteok`| Comma-separated source adapters.                   |
| `SOURCE_LIMIT`      | `80`               | Max postings fetched per source.                   |
| `PORT`              | `4000`             | Server port (hosts inject their own).              |
| `DATA_DIR`          | `server/data`      | Where JSON data is stored; point at a mounted disk for persistence. |

## How extraction works

Each posting is turned into structured fields — **skills, role, seniority, salary
band, work mode, years of experience, and a one-line summary** — against a shared
taxonomy (`server/src/ai/taxonomy.js`) so results aggregate cleanly. When a key is
set, `claude.js` extracts them via Claude with a JSON schema (`output_config.format`);
otherwise, or if a Claude call fails, `heuristic.js` derives them with regex/keyword
rules — so every posting always gets a result.

## Claude Job Fit Coach

Pick a posting and it compares the role against the up-to-5 skills saved in
**My Skills**, returning a fit verdict, strengths, gaps, interview talking points,
and a prep plan — via Claude (`server/src/ai/jobFit.js`). Requires
`ANTHROPIC_API_KEY`; the posting is treated as untrusted data.

## API

| Endpoint              | Description                                        |
| --------------------- | ------------------------------------------------- |
| `GET /api/status`     | Health, active provider, last refresh, progress, full skill taxonomy. |
| `GET /api/jobs`       | Filtered postings (`role`, `seniority`, `source`, `skill`, `q`). |
| `GET /api/trends`     | Aggregated trends + filter facet values.          |
| `GET /api/skill-graph`| Skill co-occurrence graph (counts + pairs) over all postings. |
| `GET /api/history`    | Dated demand snapshots for the time-series chart. |
| `POST /api/refresh`   | Trigger a scrape + extract (async; poll status).  |
| `POST /api/job-fit`   | Claude job-fit analysis for `{ jobId, skills }`.  |

## Personalized features

Pick up to 5 skills in **My Skills** (saved in your browser) to unlock:

- **Skill gap & recommendations** — "next skill to learn", scored by how often a
  skill pairs with skills you already have (co-occurrence) blended with market
  demand, plus your coverage of the top-15 in-demand skills.
- **Job match score** — each posting is scored by the share of your skills it
  requires; sort the table by best match and see matched skills highlighted.
- **Demand over time** — every refresh records a snapshot to `data/history.json`,
  so the line chart shows genuine demand trends for your skills as data accrues.
- **Job Fit Coach** — a Claude-written fit analysis for a chosen posting.

## Project layout

```
server/src/
  sources/      source adapters (remotive, remoteok, adzuna, arbeitnow, sample) + registry
  ai/           taxonomy, claude.js, heuristic.js, extract.js (orchestrator), jobFit.js (coach)
  store/        jsonStore.js (atomic JSON persistence)
  pipeline.js   scrape → extract → save
  analytics.js  trend computation
  index.js      Express API
client/src/
  components/    Filters, SummaryCards, SkillsList, MySkills, SkillGap,
                 DemandHistory, Charts (salary/seniority), JobsTable, JobFitCoach
  useMySkills.js shared My Skills state (localStorage)
  api.js         backend fetch wrappers
  App.jsx        dashboard shell
```
