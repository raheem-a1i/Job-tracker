// The Muse public jobs API — https://www.themuse.com/api/public/jobs
// Public, keyless (an optional key raises rate limits). ~20 jobs per page.
import { stripHtml, makeId, truncate } from './util.js';

export const name = 'themuse';

export async function fetchJobs(limit = 80) {
  const out = [];
  const maxPages = 8;

  for (let page = 0; page < maxPages && out.length < limit; page++) {
    const res = await fetch(`https://www.themuse.com/api/public/jobs?page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'job-market-tracker' },
    });
    if (!res.ok) throw new Error(`The Muse responded ${res.status}`);

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    if (results.length === 0) break;

    for (const j of results) {
      out.push({
        id: makeId(name, j.id),
        source: name,
        title: j.name || 'Unknown',
        company: j.company?.name || 'Unknown',
        location: j.locations?.[0]?.name || 'Remote',
        url: j.refs?.landing_page || '',
        postedAt: j.publication_date || new Date().toISOString(),
        salaryRaw: '',
        tags: [
          ...(j.levels || []).map((l) => l.name),
          ...(j.categories || []).map((c) => c.name),
        ],
        description: truncate(stripHtml(j.contents || '')),
      });
    }
  }

  return out.slice(0, limit);
}
