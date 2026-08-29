// The end-to-end refresh: fetch from sources -> extract (local model or
// heuristic) -> persist -> record metadata. Guarded so only one runs at a time.
import { config } from './config.js';
import { fetchAllSources } from './sources/index.js';
import { extractAll, resolveProvider } from './ai/extract.js';
import { buildSnapshot } from './analytics.js';
import { saveJobs, saveMeta, getJobs, appendSnapshot } from './store/jsonStore.js';

let running = false;
let lastProgress = null;

export const isRefreshing = () => running;
export const getProgress = () => lastProgress;

export async function runRefresh({ log = console.log } = {}) {
  if (running) throw new Error('A refresh is already in progress');
  running = true;
  lastProgress = { phase: 'fetching', done: 0, total: 0 };

  try {
    log(`Fetching from sources: ${config.sources.join(', ')}`);
    const { jobs, errors } = await fetchAllSources(config.sources, config.sourceLimit);
    log(`Fetched ${jobs.length} postings (${errors.length} source errors)`);

    const sourceCounts = jobs.reduce((acc, j) => {
      acc[j.source] = (acc[j.source] || 0) + 1;
      return acc;
    }, {});

    lastProgress = { phase: 'extracting', done: 0, total: jobs.length };
    log(`Extracting with provider: ${resolveProvider()} (heuristic fallback)`);

    const { enriched, stats } = await extractAll(jobs, {
      onProgress: (done, total) => {
        lastProgress = { phase: 'extracting', done, total };
      },
    });

    lastProgress = { phase: 'saving', done: enriched.length, total: enriched.length };
    const all = await saveJobs(enriched);

    // Record a dated snapshot of current demand so trends accrue over time.
    await appendSnapshot(buildSnapshot(all));

    const meta = {
      lastRefresh: new Date().toISOString(),
      jobCount: all.length,
      addedThisRun: enriched.length,
      sources: sourceCounts,
      sourceErrors: errors,
      extraction: stats,
    };
    await saveMeta(meta);
    log(`Done. ${all.length} total jobs stored.`);

    lastProgress = { phase: 'done', done: enriched.length, total: enriched.length };
    return meta;
  } finally {
    running = false;
  }
}

// Ensure there is data on first boot so the dashboard isn't empty.
export async function ensureSeeded({ log = console.log } = {}) {
  const jobs = await getJobs();
  if (jobs.length === 0) {
    log('No stored jobs — running an initial refresh…');
    await runRefresh({ log });
  }
}
