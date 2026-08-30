// Shared "job tracker" state: jobs the user saved (from the list or added
// manually), each with a status and notes. Persisted to localStorage, lifted to
// App so both the postings table (Save button) and the tracker panel share it.
import { useState, useEffect, useCallback, useMemo } from 'react';

export const JOB_STATUSES = ['Saved', 'Applied', 'Interviewed', 'Offer', 'Rejected'];
const STORAGE_KEY = 'jmt.savedJobs';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// Fill in defaults for a saved-job record.
function normalize(job) {
  return {
    status: 'Saved',
    notes: '',
    dateAdded: new Date().toISOString(),
    ...job,
  };
}

export function useSavedJobs() {
  const [jobs, setJobs] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  // Add if not already tracked (dedupe by id); newest first.
  const add = useCallback((job) => {
    setJobs((prev) => (prev.some((j) => j.id === job.id) ? prev : [normalize(job), ...prev]));
  }, []);

  const remove = useCallback((id) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  // Patch a tracked job's fields (status, notes, …).
  const update = useCallback((id, patch) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  // Save if not tracked, remove if it is (used by the table's Save toggle).
  const toggle = useCallback((job) => {
    setJobs((prev) =>
      prev.some((j) => j.id === job.id)
        ? prev.filter((j) => j.id !== job.id)
        : [normalize(job), ...prev],
    );
  }, []);

  const ids = useMemo(() => new Set(jobs.map((j) => j.id)), [jobs]);

  return { jobs, add, remove, update, toggle, ids };
}
