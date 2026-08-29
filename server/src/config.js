// Central configuration, read once from the environment.
// `node --env-file-if-exists=../.env` loads the root .env before this runs.

const int = (value, fallback) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: int(process.env.PORT, 4000),

  // Max postings sent to the local model per refresh (rest use the heuristic).
  aiMaxJobs: int(process.env.AI_MAX_JOBS, 60),

  // Extraction provider:
  //   'local'     → in-process zero-shot classifier (runs on this host)
  //   'heuristic' → rule-based extractor (default; no model download)
  aiProvider: (process.env.AI_PROVIDER?.trim() || 'heuristic').toLowerCase(),
  // Hugging Face model id for the local role classifier (downloaded + cached once).
  localAiModel: process.env.LOCAL_AI_MODEL?.trim() || 'Xenova/nli-deberta-v3-small',

  // Adzuna API credentials (free from https://developer.adzuna.com).
  // Only needed when 'adzuna' is in SOURCES.
  adzunaAppId: process.env.ADZUNA_APP_ID?.trim() || null,
  adzunaAppKey: process.env.ADZUNA_APP_KEY?.trim() || null,
  adzunaCountry: (process.env.ADZUNA_COUNTRY?.trim() || 'us').toLowerCase(),

  // Greenhouse company board slugs to pull from (only used if 'greenhouse' is
  // in SOURCES). Each token is a company's public Greenhouse board.
  greenhouseCompanies: (
    process.env.GREENHOUSE_COMPANIES?.trim() ||
    'anthropic,stripe,databricks,figma,discord,gitlab,brex,flexport,rippling,mongodb'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Which source adapters to pull from, and how many postings each.
  sources: (process.env.SOURCES?.trim() || 'remotive,remoteok')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  sourceLimit: int(process.env.SOURCE_LIMIT, 80),
};
