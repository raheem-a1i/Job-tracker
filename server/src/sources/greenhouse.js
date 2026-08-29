// Greenhouse company job boards — https://boards-api.greenhouse.io
// Official, public, keyless per-company endpoints. Real openings straight from
// the companies' own applicant-tracking system. The company list is configurable
// (GREENHOUSE_COMPANIES); each token is a company's board slug.
import { stripHtml, makeId, truncate } from './util.js';
import { config } from '../config.js';

export const name = 'greenhouse';

// Greenhouse returns HTML-entity-encoded content (e.g. "&lt;p&gt;"), so decode
// the tag delimiters before stripping tags.
function decodeAndStrip(html = '') {
  const decoded = String(html)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  return stripHtml(decoded);
}

async function fetchBoardName(token) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

export async function fetchJobs(limit = 80) {
  const companies = config.greenhouseCompanies;
  if (companies.length === 0) return [];

  const perCompany = Math.max(5, Math.ceil(limit / companies.length));
  const out = [];

  for (const token of companies) {
    if (out.length >= limit) break;
    try {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) continue; // unknown / removed board — skip it

      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      if (jobs.length === 0) continue;

      const company = (await fetchBoardName(token)) || token;

      for (const j of jobs.slice(0, perCompany)) {
        out.push({
          id: makeId(name, `${token}-${j.id}`),
          source: name,
          title: j.title || 'Unknown',
          company,
          location: j.location?.name || 'Unknown',
          url: j.absolute_url || '',
          postedAt: j.updated_at || new Date().toISOString(),
          salaryRaw: '',
          tags: [],
          description: truncate(decodeAndStrip(j.content || '')),
        });
      }
    } catch {
      // network issue for this company — skip, keep the rest
    }
  }

  return out.slice(0, limit);
}
