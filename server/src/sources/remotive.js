// Remotive public jobs API — https://remotive.com/api/remote-jobs
// Documented and intended for public consumption; no key required.
import { stripHtml, makeId, truncate } from './util.js';

export const name = 'remotive';

export async function fetchJobs(limit = 80) {
  const url = `https://remotive.com/api/remote-jobs?limit=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'job-market-tracker' },
  });
  if (!res.ok) throw new Error(`Remotive responded ${res.status}`);

  const data = await res.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return jobs.slice(0, limit).map((j) => ({
    id: makeId(name, j.id),
    source: name,
    title: j.title ?? 'Unknown',
    company: j.company_name ?? 'Unknown',
    location: j.candidate_required_location || 'Remote',
    url: j.url ?? '',
    postedAt: j.publication_date ?? new Date().toISOString(),
    // Remotive sometimes exposes a salary string; keep it for the extractor.
    salaryRaw: j.salary || '',
    tags: Array.isArray(j.tags) ? j.tags : [],
    description: truncate(stripHtml(j.description)),
  }));
}
