// HTTP API for the dashboard.
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getJobs, getMeta, getHistory } from './store/jsonStore.js';
import { computeTrends, computeFacets, filterJobs, computeSkillGraph } from './analytics.js';
import { runRefresh, isRefreshing, getProgress, ensureSeeded } from './pipeline.js';
import { resolveProvider } from './ai/extract.js';
import { analyzeJobFit, JOB_FIT_MODEL } from './ai/jobFit.js';
import { ALL_SKILLS } from './ai/taxonomy.js';

// Built React app (present in production single-host deploys).
const CLIENT_DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');

const app = express();
app.use(cors());
app.use(express.json());

// Health / status — also tells the UI which extraction provider is active.
app.get('/api/status', async (req, res) => {
  const meta = await getMeta();
  const provider = resolveProvider();
  res.json({
    ok: true,
    provider,
    model: provider === 'claude' ? config.claudeModel : null,
    sources: config.sources,
    allSkills: ALL_SKILLS,
    refreshing: isRefreshing(),
    progress: getProgress(),
    meta,
  });
});

// Filtered job list (used by the table). Filters come from query params.
app.get('/api/jobs', async (req, res) => {
  const jobs = await getJobs();
  const filtered = filterJobs(jobs, req.query);
  const limit = Math.min(parseInt(req.query.limit ?? '200', 10) || 200, 1000);
  res.json({ total: filtered.length, jobs: filtered.slice(0, limit) });
});

// Aggregated trends + facet values. Respects the same filters as /api/jobs.
app.get('/api/trends', async (req, res) => {
  const jobs = await getJobs();
  const filtered = filterJobs(jobs, req.query);
  res.json({
    trends: computeTrends(filtered),
    facets: computeFacets(jobs),
  });
});

// Skill co-occurrence graph over ALL jobs (unfiltered), so recommendations are
// stable regardless of the dashboard's current filters.
app.get('/api/skill-graph', async (req, res) => {
  const jobs = await getJobs();
  res.json(computeSkillGraph(jobs));
});

// Dated demand snapshots for the demand-over-time chart.
app.get('/api/history', async (req, res) => {
  res.json({ history: await getHistory() });
});

app.post('/api/job-fit', async (req, res) => {
  const jobId = typeof req.body?.jobId === 'string' ? req.body.jobId.trim() : '';
  const skills = Array.isArray(req.body?.skills)
    ? req.body.skills
        .filter((skill) => typeof skill === 'string' && skill.trim())
        .map((skill) => skill.trim())
        .slice(0, 5)
    : [];

  if (!jobId || skills.length === 0) {
    return res.status(400).json({ error: 'Choose a job and save at least one skill' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const jobs = await getJobs();
  const job = jobs.find((candidate) => candidate.id === jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  try {
    const analysis = await analyzeJobFit(job, skills);
    return res.json({ jobId: job.id, model: JOB_FIT_MODEL, analysis });
  } catch (err) {
    // Surface the real Anthropic error so key/billing/model issues are visible.
    console.error('Claude job fit analysis failed:', err);
    const status = err?.status ? `HTTP ${err.status}` : err?.name || 'error';
    const detail = err?.error?.error?.message || err?.message || 'unknown error';
    return res.status(502).json({ error: `Claude ${status}: ${detail}` });
  }
});

// Trigger a scrape + extract. Returns immediately; poll /api/status for progress.
app.post('/api/refresh', async (req, res) => {
  if (isRefreshing()) {
    return res.status(409).json({ error: 'A refresh is already in progress' });
  }
  runRefresh().catch((err) => console.error('Refresh failed:', err));
  res.status(202).json({ started: true });
});

// In production, serve the built frontend from the same origin as the API.
// The regex fallback returns index.html for any non-/api GET (SPA support)
// without shadowing the API routes above.
if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(join(CLIENT_DIST, 'index.html')));
}

app.listen(config.port, async () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Extraction provider: ${resolveProvider()}`);
  try {
    await ensureSeeded();
  } catch (err) {
    console.error('Initial seed failed:', err.message);
  }
});
