// Central configuration, read once from the environment.
// `node --env-file-if-exists=../.env` loads the root .env before this runs.

const int = (value, fallback) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 4000),

  // Claude extraction model (sonnet-5 is much cheaper than opus for bulk work).
  claudeModel: process.env.CLAUDE_MODEL?.trim() || 'claude-sonnet-5',
  // Cost / rate guards for the Claude extraction step.
  aiMaxJobs: int(process.env.AI_MAX_JOBS, 60),
  aiConcurrency: Math.max(1, int(process.env.AI_CONCURRENCY, 5)),

  // Adzuna API credentials (free from https://developer.adzuna.com).
  // Only needed when 'adzuna' is in SOURCES.
  adzunaAppId: process.env.ADZUNA_APP_ID?.trim() || null,
  adzunaAppKey: process.env.ADZUNA_APP_KEY?.trim() || null,
  adzunaCountry: (process.env.ADZUNA_COUNTRY?.trim() || 'us').toLowerCase(),

  // Which source adapters to pull from, and how many postings each.
  sources: (process.env.SOURCES?.trim() || 'remotive,remoteok')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  sourceLimit: int(process.env.SOURCE_LIMIT, 80),
};

// True when Claude extraction is available; otherwise the heuristic is used.
export const claudeEnabled = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
