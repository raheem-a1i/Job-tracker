// In-process AI extraction — no API key, runs on this machine.
// Uses a small zero-shot classification model (via Transformers.js / ONNX) to
// classify the ROLE from posting text — the one field where understanding the
// title beats keyword matching. Everything else (skills, salary, seniority,
// work mode, experience, summary) reuses the deterministic heuristic: seniority
// is driven by explicit words ("senior"/"junior"/"staff") that regex nails more
// reliably than a tiny model, and skills/salary are exact-match / number tasks.
import { pipeline, env } from '@xenova/transformers';
import { config } from '../config.js';
import { ROLE_CATEGORIES } from './taxonomy.js';
import { heuristicExtract } from './heuristic.js';

// Allow remote model download on first run; cache locally afterwards.
env.allowRemoteModels = true;

// Load the model once and reuse it across every posting.
let classifierPromise = null;
function getClassifier() {
  if (!classifierPromise) {
    classifierPromise = pipeline('zero-shot-classification', config.localAiModel);
  }
  return classifierPromise;
}

// Pre-load the model so the first posting in a refresh isn't slow mid-loop.
export async function warmupLocalAi() {
  await getClassifier();
}

// Title carries the strongest signal; add a description snippet for context.
function buildText(job) {
  return `${job.title}. ${(job.description || '').slice(0, 600)}`.trim();
}

export async function localExtract(job) {
  const base = heuristicExtract(job);

  // If the heuristic already recognizes a clearly non-technical role, trust it —
  // the small model tends to force such postings into a tech bucket (it scores
  // "Security" over "Non-technical" just because the word is in the title).
  if (base.role === 'Non-technical') {
    return { ...base, extractedBy: 'local-ai' };
  }

  // The hypothesis template phrases each label as a claim the model scores;
  // labels come back sorted by score, so the top one is the best-fit role.
  const role = await getClassifier().then((clf) =>
    clf(buildText(job), ROLE_CATEGORIES, { hypothesis_template: 'This is a {} job.' }),
  );

  // Everything else stays on the heuristic; only role is model-classified.
  return { ...base, role: role.labels[0] || 'Other', extractedBy: 'local-ai' };
}
