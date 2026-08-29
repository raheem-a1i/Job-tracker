// Helpers shared by all source adapters.

// Strip HTML tags and collapse whitespace from raw description fields.
export function stripHtml(html = '') {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A stable id so re-runs don't create duplicate records.
export function makeId(source, key) {
  return `${source}:${key}`;
}

// Clamp a description to keep token usage (and storage) reasonable.
export function truncate(text = '', max = 4000) {
  const t = String(text);
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
