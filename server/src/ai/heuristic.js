// Keyword/regex extractor. No model, no cost — the default extractor, and the
// automatic per-job fallback when the local model is enabled but a call fails.
import { SKILL_PATTERNS } from './taxonomy.js';

function detectSkills(text) {
  const found = [];
  for (const [skill, pattern] of Object.entries(SKILL_PATTERNS)) {
    if (pattern.test(text)) found.push(skill);
  }
  return found;
}

// Clearly non-technical roles (the scraped feeds include many). Checked first so
// they aren't forced into a tech bucket like "Backend" or "Security".
const NON_TECH = /\b(sales development|sales representative|account executive|account manager|business development|marketing (?:manager|specialist|coordinator|associate)|recruiter|talent acquisition|human resources|hr\b|payroll|accountant|bookkeeper|financial analyst|underwriter|nurse|physician|caregiver|therapist|teacher|tutor|instructor|driver|delivery|warehouse|forklift|retail|cashier|merchandiser|cleaner|janitor|custodian|housekeep|security guard|dispatcher|line cook|chef|waiter|waitress|bartender|barista|electrician|plumber|welder|machinist|assembler|laborer|ordnance|production (?:associate|line|worker|operator|technician)|receptionist|administrative assistant|executive assistant|call center|customer service representative)\b/;

function classifyRole(title, text) {
  const t = `${title} ${text}`.toLowerCase();
  if (NON_TECH.test(t)) return 'Non-technical';
  // Order matters: check specific roles before generic "engineer".
  if (/\b(machine learning|ml engineer|deep learning)\b/.test(t)) return 'Machine Learning';
  if (/\bdata scien/.test(t)) return 'Data Science';
  if (/\bdata engineer|\betl\b|\bdata pipeline/.test(t)) return 'Data Engineering';
  if (/\b(devops|sre|site reliability|platform engineer|infrastructure)\b/.test(t))
    return 'DevOps / SRE';
  if (/\b(security|infosec|appsec)\b/.test(t)) return 'Security';
  if (/\b(qa|quality assurance|test engineer|sdet)\b/.test(t)) return 'QA';
  if (/\b(designer|ux|ui designer)\b/.test(t)) return 'Design';
  if (/\bproduct manager|\bproduct owner\b/.test(t)) return 'Product';
  if (/\b(engineering manager|director|vp of|head of)\b/.test(t)) return 'Management';
  if (/\b(ios|android|mobile|react native|flutter)\b/.test(t)) return 'Mobile';
  if (/\bfull[\s-]?stack\b/.test(t)) return 'Full Stack';
  if (/\b(frontend|front[\s-]?end|ui engineer)\b/.test(t)) return 'Frontend';
  if (/\b(backend|back[\s-]?end|server[\s-]?side)\b/.test(t)) return 'Backend';
  if (/\b(engineer|developer|programmer)\b/.test(t)) return 'Backend';
  return 'Other';
}

function classifySeniority(title, text) {
  const t = `${title} ${text}`.toLowerCase();
  if (/\bprincipal\b/.test(t)) return 'Principal';
  if (/\b(staff|lead|tech lead)\b/.test(t)) return 'Lead';
  if (/\bsenior|\bsr\.?\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.?|entry[\s-]?level|graduate)\b/.test(t)) return 'Junior';
  if (/\bintern(ship)?\b/.test(t)) return 'Intern';
  return 'Mid';
}

// Remove numbers that look like money but aren't salary, before parsing:
//  - retirement/benefit plans: 401(k), 401k, 403(b), 457(b), 529
//  - company finance figures: funding / ARR / MRR / revenue / valuation / Series X
function sanitizeForSalary(text) {
  return String(text)
    .replace(/\b40[13]\s*\(?\s*[kb]\s*\)?/gi, ' ') // 401k, 401(k), 403b, 403(b)
    .replace(/\b457\s*\(?\s*b\s*\)?/gi, ' ') // 457(b)
    .replace(/\b529\b/gi, ' ') // 529 college plan
    // "$50M in funding", "$500k ARR", "raised $12M", "Series B"
    .replace(
      /\$?\d[\d,.]*\s*[kmb]?\s*(?:in\s+)?(?:funding|raised|arr|mrr|revenue|valuation|seed|series\s+[a-e])\b/gi,
      ' ',
    )
    .replace(/\b(?:funding|raised|arr|mrr|revenue|valuation)\s+(?:of\s+)?\$?\d[\d,.]*\s*[kmb]?/gi, ' ')
    .replace(/\b24\s*\/\s*7\b/g, ' '); // "24/7" support
}

// Parse a salary band from free text. Handles k-suffixes, ranges, $/€/£.
function parseSalary(text) {
  const empty = { min: null, max: null, currency: null, period: 'year' };
  if (!text) return empty;

  const clean = sanitizeForSalary(text);

  const currency = /€|eur/i.test(clean)
    ? 'EUR'
    : /£|gbp/i.test(clean)
      ? 'GBP'
      : /\$|usd/i.test(clean)
        ? 'USD'
        : null;

  // Endpoints of an explicit range ("$120k–$150k", "90000-120000 USD") are
  // trusted even at the high end; a lone ~$1M figure in prose is almost always
  // noise (equity, pipeline, total-comp hype), so we drop it unless it's part
  // of a stated range.
  const money = String.raw`\$?€?£?\s?\d{1,3}(?:[,\s]?\d{3})*(?:\.\d+)?\s*[km]?`;
  const rangeRe = new RegExp(`(${money})\\s*(?:-|–|—|to)\\s*(${money})`, 'gi');
  const toNum = (tok) => {
    let n = parseFloat(tok.replace(/[^\d.]/g, ''));
    if (/k/i.test(tok)) n *= 1_000;
    else if (/m/i.test(tok)) n *= 1_000_000;
    return Math.round(n);
  };
  const rangeEndpoints = new Set();
  let rm;
  while ((rm = rangeRe.exec(clean)) !== null) {
    rangeEndpoints.add(toNum(rm[1]));
    rangeEndpoints.add(toNum(rm[2]));
  }

  // Find money-looking numbers, optionally with a k suffix.
  const nums = [];
  const re = /(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)\s*(k|m)?/gi;
  let m;
  while ((m = re.exec(clean)) !== null) {
    let n = parseFloat(m[1].replace(/[,\s]/g, ''));
    const suffix = (m[2] || '').toLowerCase();
    if (suffix === 'k') n *= 1_000;
    else if (suffix === 'm') n *= 1_000_000;
    // Plausible annual-comp band (filters "5+ years", PTO counts, funding sums).
    if (n < 20_000 || n > 1_000_000) continue;
    // Drop a lone very-high figure (~$1M) unless it's a stated range endpoint.
    if (n >= 900_000 && !rangeEndpoints.has(Math.round(n))) continue;
    nums.push(n);
  }
  if (nums.length === 0) return { ...empty, currency };

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max: max === min ? null : max, currency: currency || 'USD', period: 'year' };
}

function detectWorkMode(job) {
  const t = `${job.location} ${job.description}`.toLowerCase();
  if (/\bhybrid\b/.test(t)) return 'Hybrid';
  if (/\bon-?site\b|\bin[-\s]office\b|\bin[-\s]person\b/.test(t)) return 'Onsite';
  if (/\bremote\b|work from home|\bwfh\b/.test(t)) return 'Remote';
  return 'Unknown';
}

function parseExperience(text) {
  const re = /(\d{1,2})\s*\+?\s*(?:years|yrs?)\b/gi;
  const years = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 0 && n <= 20) years.push(n);
  }
  return years.length ? Math.min(...years) : null;
}

function makeSummary(job) {
  // First sentence of the description, trimmed to a single line.
  const first = (job.description || '').split(/(?<=[.!?])\s+/)[0]?.trim() || '';
  if (first.length >= 20) return first.length > 140 ? `${first.slice(0, 137)}…` : first;
  return `${job.title} at ${job.company}`.slice(0, 140);
}

export function heuristicExtract(job) {
  const text = `${job.title}\n${job.description}\n${(job.tags || []).join(' ')}`;
  return {
    skills: detectSkills(text),
    role: classifyRole(job.title, job.description),
    seniority: classifySeniority(job.title, job.description),
    salary: parseSalary(`${job.salaryRaw} ${job.description}`),
    workMode: detectWorkMode(job),
    experienceYears: parseExperience(job.description),
    summary: makeSummary(job),
    extractedBy: 'heuristic',
  };
}
