// Jobicy remote-jobs API — https://jobicy.com/api/v2/remote-jobs
// Public, keyless. Remote-focused, includes salary on some postings.
import { stripHtml, makeId, truncate } from './util.js';

export const name = 'jobicy';

export async function fetchJobs(limit = 80) {
  const count = Math.min(50, limit); // Jobicy returns at most 50 per request
  const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=${count}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'job-market-tracker' },
  });
  if (!res.ok) throw new Error(`Jobicy responded ${res.status}`);

  const data = await res.json();
  const jobs = Array.isArray(data.jobs) ? data.jobs : [];

  return jobs.slice(0, limit).map((j) => {
    const hasSalary = j.annualSalaryMin || j.annualSalaryMax;
    return {
      id: makeId(name, j.id),
      source: name,
      title: j.jobTitle || 'Unknown',
      company: j.companyName || 'Unknown',
      location: j.jobGeo || 'Remote',
      url: j.url || '',
      postedAt: j.pubDate ? new Date(j.pubDate).toISOString() : new Date().toISOString(),
      salaryRaw: hasSalary
        ? `${j.annualSalaryMin ?? ''}-${j.annualSalaryMax ?? ''} ${j.salaryCurrency ?? ''}`.trim()
        : '',
      tags: [
        ...(Array.isArray(j.jobIndustry) ? j.jobIndustry : []),
        ...(Array.isArray(j.jobType) ? j.jobType : []),
      ],
      description: truncate(stripHtml(j.jobDescription || j.jobExcerpt || '')),
    };
  });
}
