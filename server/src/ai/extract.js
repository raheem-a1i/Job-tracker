// Extraction orchestrator: routes each job through Claude (when a key is set)
// with an automatic per-job fallback to the rule-based heuristic. Bounded
// concurrency stays within rate limits; aiMaxJobs caps Claude spend per refresh.
import { config, claudeEnabled } from '../config.js';
import { claudeExtract } from './claude.js';
import { heuristicExtract } from './heuristic.js';

// Resolve which extractor a run will use.
export function resolveProvider() {
  return claudeEnabled ? 'claude' : 'heuristic';
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
  const stats = { provider, claude: 0, heuristic: 0, aiFailures: 0, total: jobs.length };
  let done = 0;

  const enriched = await mapLimit(jobs, config.aiConcurrency, async (job, index) => {
    const useClaude = provider === 'claude' && index < config.aiMaxJobs;
    let extraction;

    if (useClaude) {
      try {
        extraction = await claudeExtract(job);
        stats.claude++;
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
