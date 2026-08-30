// Source registry. Each adapter exports { name, fetchJobs(limit) } and returns
// postings in the shared normalized shape. Add a new board by dropping a file
// here and registering it below — the rest of the pipeline is source-agnostic.
import * as remotive from './remotive.js';
import * as remoteok from './remoteok.js';
import * as adzuna from './adzuna.js';
import * as arbeitnow from './arbeitnow.js';
import * as sample from './sample.js';

const ADAPTERS = {
  [remotive.name]: remotive,
  [remoteok.name]: remoteok,
  [adzuna.name]: adzuna,
  [arbeitnow.name]: arbeitnow,
  [sample.name]: sample,
};

export function getAdapter(name) {
  return ADAPTERS[name] || null;
}

// Fetch from every requested source. Failures are isolated so one flaky board
// (or no network) never sinks the whole refresh — the sample source still works.
export async function fetchAllSources(sourceNames, limit) {
  const results = [];
  const errors = [];

  await Promise.all(
    sourceNames.map(async (name) => {
      const adapter = getAdapter(name);
      if (!adapter) {
        errors.push({ source: name, error: 'unknown source' });
        return;
      }
      try {
        const jobs = await adapter.fetchJobs(limit);
        results.push(...jobs);
      } catch (err) {
        errors.push({ source: name, error: err.message });
      }
    }),
  );

  return { jobs: results, errors };
}
