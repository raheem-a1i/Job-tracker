// Arbeitnow Job Board API — https://www.arbeitnow.com/api/job-board-api
// Public, keyless, intended for consumption. Good remote / EU coverage.
import { stripHtml, makeId, truncate } from './util.js';

export const name = 'arbeitnow';

export async function fetchJobs(limit = 80) {
  const out = [];
  const maxPages = 5;

  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'job-market-tracker' },
    });
    if (!res.ok) throw new Error(`Arbeitnow responded ${res.status}`);

    const data = await res.json();
    const jobs = Array.isArray(data.data) ? data.data : [];
    if (jobs.length === 0) break;

    for (const j of jobs) {
      out.push({
        id: makeId(name, j.slug),
        source: name,
        title: j.title || 'Unknown',
        company: j.company_name || 'Unknown',
        location: j.location || (j.remote ? 'Remote' : 'Unknown'),
        url: j.url || '',
        // Arbeitnow uses a Unix timestamp (seconds).
        postedAt: j.created_at
          ? new Date(j.created_at * 1000).toISOString()
          : new Date().toISOString(),
        salaryRaw: '',
        tags: [...(j.tags || []), ...(j.job_types || [])],
        description: truncate(stripHtml(j.description)),
      });
    }
  }

  return out.slice(0, limit);
}
