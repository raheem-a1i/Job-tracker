// RemoteOK public API — https://remoteok.com/api
// Returns a JSON array whose first element is legal/metadata. A descriptive
// User-Agent is required by their docs.
import { stripHtml, makeId, truncate } from './util.js';

export const name = 'remoteok';

export async function fetchJobs(limit = 80) {
  const res = await fetch('https://remoteok.com/api', {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'job-market-tracker (https://github.com/your/repo)',
    },
  });
  if (!res.ok) throw new Error(`RemoteOK responded ${res.status}`);

  const data = await res.json();
  // First entry is a legal notice, not a job — drop anything without an id/position.
  const jobs = (Array.isArray(data) ? data : []).filter((j) => j && j.id && j.position);

  return jobs.slice(0, limit).map((j) => ({
    id: makeId(name, j.id),
    source: name,
    title: j.position ?? 'Unknown',
    company: j.company ?? 'Unknown',
    location: j.location || 'Remote',
    url: j.url ?? (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : ''),
    postedAt: j.date ?? new Date().toISOString(),
    salaryRaw:
      j.salary_min || j.salary_max
        ? `${j.salary_min ?? ''}-${j.salary_max ?? ''} USD`
        : '',
    tags: Array.isArray(j.tags) ? j.tags : [],
    description: truncate(stripHtml(j.description)),
  }));
}
