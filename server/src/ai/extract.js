// Extraction orchestrator: routes each job through the configured provider
// (in-process local model, or the rule-based heuristic) with an automatic
// per-job fallback to the heuristic. aiMaxJobs caps how many postings hit the
// (slower) local model per refresh.
import { config } from '../config.js';
import { heuristicExtract } from './heuristic.js';

// The local model pulls in a heavy dependency, so load it only when needed.
let localModule = null;
async function getLocal() {
  if (!localModule) localModule = await import('./local.js');
  return localModule;
}

// Resolve which extractor a run will use.
export function resolveProvider() {
  return config.aiProvider === 'local' ? 'local' : 'heuristic';
}

// Run async `worker` over `items` with at most `concurrency` in flight.
async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

export async function extractAll(jobs, { onProgress } = {}) {
  const provider = resolveProvider();
  const stats = { provider, local: 0, heuristic: 0, aiFailures: 0, total: jobs.length };
  let done = 0;

  // Warm up the local model once so the first posting isn't slow mid-loop.
  let local = null;
  if (provider === 'local') {
    try {
      local = await getLocal();
      await local.warmupLocalAi();
    } catch {
      local = null; // model unavailable → every job falls back to heuristic
    }
  }

  const enriched = await mapLimit(jobs, 1, async (job, index) => {
    const useLocal = provider === 'local' && local && index < config.aiMaxJobs;
    let extraction;

    if (useLocal) {
      try {
        extraction = await local.localExtract(job);
        stats.local++;
      } catch {
        stats.aiFailures++;
        extraction = heuristicExtract(job);
        stats.heuristic++;
      }
    } else {
      extraction = heuristicExtract(job);
      stats.heuristic++;
    }

    done++;
    onProgress?.(done, jobs.length);
    return { ...job, extraction };
  });

  return { enriched, stats };
}
