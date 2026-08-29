// Shared "My Skills" state: the user's focus list, persisted to localStorage and
// capped. Lifted to App so the picker, gap analysis, and job match all read one
// source of truth.
import { useState, useEffect, useCallback } from 'react';

export const MAX_SKILLS = 5;
const STORAGE_KEY = 'jmt.mySkills';

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(v) ? v.slice(0, MAX_SKILLS) : [];
  } catch {
    return [];
  }
}

export function useMySkills() {
  const [skills, setSkills] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  }, [skills]);

  const add = useCallback((skill) => {
    setSkills((prev) =>
      prev.includes(skill) || prev.length >= MAX_SKILLS ? prev : [...prev, skill],
    );
  }, []);

  const remove = useCallback((skill) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  }, []);

  return { skills, add, remove, full: skills.length >= MAX_SKILLS, max: MAX_SKILLS };
}
