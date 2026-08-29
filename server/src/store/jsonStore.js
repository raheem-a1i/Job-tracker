// Dead-simple JSON-file persistence. Jobs are keyed by id so repeated refreshes
// merge rather than duplicate. Writes are atomic (temp file + rename).
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Defaults to server/data; set DATA_DIR to a mounted volume for persistence
// across redeploys (e.g. a Render Persistent Disk or Railway Volume).
const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
const JOBS_FILE = join(DATA_DIR, 'jobs.json');
const META_FILE = join(DATA_DIR, 'meta.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

async function writeJson(file, data) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await rename(tmp, file);
}

export async function getJobs() {
  return readJson(JOBS_FILE, []);
}

export async function getMeta() {
  return readJson(META_FILE, { lastRefresh: null, jobCount: 0, sources: {}, extraction: {} });
}

// Merge new records over existing ones (by id), newest first.
export async function saveJobs(newJobs) {
  const existing = await getJobs();
  const byId = new Map(existing.map((j) => [j.id, j]));
  for (const job of newJobs) byId.set(job.id, job);
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.postedAt) - new Date(a.postedAt),
  );
  await writeJson(JOBS_FILE, merged);
  return merged;
}

export async function saveMeta(meta) {
  await writeJson(META_FILE, meta);
  return meta;
}

export async function getHistory() {
  return readJson(HISTORY_FILE, []);
}

// Append a dated snapshot of skill demand. Skips no-op points (identical to the
// previous snapshot) and caps total length so the file can't grow unbounded.
export async function appendSnapshot(snapshot, { cap = 200 } = {}) {
  const history = await getHistory();
  const last = history[history.length - 1];
  const unchanged =
    last &&
    last.totalJobs === snapshot.totalJobs &&
    JSON.stringify(last.skills) === JSON.stringify(snapshot.skills);
  if (unchanged) return history;

  const next = [...history, snapshot].slice(-cap);
  await writeJson(HISTORY_FILE, next);
  return next;
}
