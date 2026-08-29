// Adzuna Jobs API — https://developer.adzuna.com
// A legitimate aggregator with an official API. Requires free credentials
// (app_id + app_key) set in .env. Includes salary and location data.
import { stripHtml, makeId, truncate } from './util.js';
import { config } from '../config.js';

export const name = 'adzuna';

export async function fetchJobs(limit = 80) {
  const { adzunaAppId, adzunaAppKey, adzunaCountry } = config;
  if (!adzunaAppId || !adzunaAppKey) {
    throw new Error('Adzuna needs ADZUNA_APP_ID and ADZUNA_APP_KEY in .env (free at developer.adzuna.com)');
  }

  const perPage = Math.min(50, limit); // Adzuna caps at 50 results per page
  const maxPages = Math.min(5, Math.ceil(limit / perPage));
  const currency = adzunaCountry === 'gb' ? 'GBP' : adzunaCountry === 'us' ? 'USD' : '';
  const out = [];

  for (let page = 1; page <= maxPages && out.length < limit; page++) {
    const params = new URLSearchParams({
      app_id: adzunaAppId,
      app_key: adzunaAppKey,
      results_per_page: String(perPage),
      'content-type': 'application/json',
    });
    const url = `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/${page}?${params}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Adzuna responded ${res.status}`);

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];

    for (const j of results) {
      const hasSalary = j.salary_min || j.salary_max;
      out.push({
        id: makeId(name, j.id),
        source: name,
        title: j.title ? stripHtml(j.title) : 'Unknown',
        company: j.company?.display_name || 'Unknown',
        location: j.location?.display_name || 'Unknown',
        url: j.redirect_url || '',
        postedAt: j.created || new Date().toISOString(),
        salaryRaw: hasSalary
          ? `${Math.round(j.salary_min ?? 0)}-${Math.round(j.salary_max ?? 0)} ${currency}`.trim()
          : '',
        tags: j.category?.label ? [j.category.label] : [],
        description: truncate(stripHtml(j.description)),
      });
    }
    if (results.length < perPage) break; // last page reached
  }

  return out.slice(0, limit);
}
